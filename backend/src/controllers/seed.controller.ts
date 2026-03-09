import type { Request, Response } from 'express';
import { bookRepository } from '../repositories/book.repository';
import { storageService } from '../services/storage.service';
import { generateEmbedding, buildEmbeddingInput } from '../services/embedding.service';
import { SEED_BOOKS } from '../seeds/book-data';
import { sendSuccess } from '../utils/response';
import logger from '../utils/logger';

/**
 * POST /api/admin/seed-books
 * Role: admin
 *
 * Seeds the database with sample books + HTML files.
 * Skips any book whose ISBN already exists (idempotent).
 */
export const seedBooks = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!._id;
  const results: { title: string; status: 'created' | 'skipped' }[] = [];

  for (const seed of SEED_BOOKS) {
    // Skip if ISBN already exists
    const existing = await bookRepository.findByIsbn(seed.isbn);
    if (existing) {
      results.push({ title: seed.title, status: 'skipped' });
      continue;
    }

    // Generate embedding
    let embedding: number[] | undefined;
    try {
      const input = buildEmbeddingInput(seed.title, seed.author, seed.description);
      embedding = await generateEmbedding(input);
    } catch {
      logger.warn('Embedding generation failed for seed book — proceeding without', {
        title: seed.title,
      });
    }

    // Upload HTML to GridFS
    const htmlBuffer = Buffer.from(seed.htmlContent, 'utf-8');
    const fileId = await storageService.upload(
      htmlBuffer,
      seed.fileName,
      'text/html',
      'seed', // placeholder bookId for metadata
    );

    // Create the book document
    const book = await bookRepository.create(
      {
        title: seed.title,
        author: seed.author,
        isbn: seed.isbn,
        genre: seed.genre,
        description: seed.description,
        publishedYear: seed.publishedYear,
        totalCopies: seed.totalCopies,
        fileId,
        fileName: seed.fileName,
        fileMimeType: 'text/html',
      } as Parameters<typeof bookRepository.create>[0],
      userId,
      embedding,
    );

    logger.info('Seeded book', { title: book.title, id: book._id });
    results.push({ title: seed.title, status: 'created' });
  }

  const created = results.filter((r) => r.status === 'created').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;

  sendSuccess(res, {
    message: `Seeded ${created} books (${skipped} skipped — already exist)`,
    results,
  });
};
