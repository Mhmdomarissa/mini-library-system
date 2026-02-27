import type { Types } from 'mongoose';
import { bookRepository } from '../repositories/book.repository';
import type { BookFilters } from '../repositories/book.repository';
import type { IBook } from '../models/Book';
import type { CreateBookInput, UpdateBookInput } from '../utils/validationSchemas';
import type { PaginationParams, PaginatedResult } from '../utils/pagination';
import { AppError } from '../utils/AppError';
import { generateEmbedding, buildEmbeddingInput } from './embedding.service';

/**
 * BookService — business rules only.
 * Calls bookRepository for DB access.
 * Throws AppError for rule violations.
 * Has zero knowledge of Express (no req/res).
 */
export class BookService {
  /**
   * Create a book after enforcing ISBN uniqueness.
   * Embedding is generated BEFORE the DB write so a failed OpenAI call
   * cannot leave a book without an embedding.
   * availableCopies is derived from totalCopies — never trusted from input.
   */
  async create(data: CreateBookInput, createdBy: Types.ObjectId): Promise<IBook> {
    const existing = await bookRepository.findByIsbn(data.isbn);
    if (existing) {
      throw AppError.conflict(`A book with ISBN "${data.isbn}" already exists`);
    }

    // Build and generate embedding before writing to DB.
    // If OpenAI is unavailable this throws 503 — no partial book is created.
    const embeddingInput = buildEmbeddingInput(data.title, data.author, data.description ?? '');
    const embedding = await generateEmbedding(embeddingInput);

    return bookRepository.create(data, createdBy, embedding);
  }

  /**
   * Get a single book by ID or throw 404.
   */
  async getById(id: string): Promise<IBook> {
    const book = await bookRepository.findById(id);
    if (!book) {
      throw AppError.notFound('Book not found');
    }
    return book;
  }

  /**
   * Paginated, filtered list of non-deleted books.
   */
  async list(filters: BookFilters, pagination: PaginationParams): Promise<PaginatedResult<IBook>> {
    return bookRepository.findWithFilters(filters, pagination);
  }

  /**
   * Partial update with business rule enforcement:
   * - Book must exist
   * - If ISBN changes, new ISBN must not already be in use
   * - availableCopies cannot exceed totalCopies
   * - If totalCopies decreases below availableCopies, cap availableCopies
   * - Embedding is regenerated ONLY when title, author, or description change.
   *   Unrelated field updates (genre, totalCopies, …) never call OpenAI.
   */
  async update(id: string, data: UpdateBookInput, updatedBy: Types.ObjectId): Promise<IBook> {
    const book = await bookRepository.findById(id);
    if (!book) {
      throw AppError.notFound('Book not found');
    }

    // ISBN uniqueness — only check if ISBN is actually changing
    if (data.isbn && data.isbn !== book.isbn) {
      const conflict = await bookRepository.findByIsbn(data.isbn);
      if (conflict) {
        throw AppError.conflict(`A book with ISBN "${data.isbn}" already exists`);
      }
    }

    // availableCopies guard: if totalCopies is reduced, cap availableCopies
    const newTotal = data.totalCopies ?? book.totalCopies;
    const currentAvailable = book.availableCopies;
    const safeAvailable = Math.min(currentAvailable, newTotal);

    // Re-generate embedding only when semantically-relevant text fields change.
    // If none of title/author/description are in the update payload, skip OpenAI
    // entirely — this is the key distinction between text and non-text updates.
    let embedding: number[] | undefined;
    if (data.title !== undefined || data.author !== undefined || data.description !== undefined) {
      const embeddingInput = buildEmbeddingInput(
        data.title ?? book.title,
        data.author ?? book.author,
        data.description ?? book.description,
      );
      // Throws 503 if OpenAI is unavailable — update is aborted, no partial write occurs.
      embedding = await generateEmbedding(embeddingInput);
    }

    const updated = await bookRepository.updateById(id, {
      ...data,
      ...(safeAvailable !== currentAvailable && { availableCopies: safeAvailable }),
      ...(embedding && { embedding }),
      updatedBy,
    });

    // Should not happen after a successful findById above, but guard anyway
    if (!updated) {
      throw AppError.notFound('Book not found');
    }

    return updated;
  }

  /**
   * Soft-delete a book.
   * Throws 404 if the book does not exist or is already deleted.
   */
  async softDelete(id: string, deletedBy: Types.ObjectId): Promise<void> {
    const deleted = await bookRepository.softDelete(id, deletedBy);
    if (!deleted) {
      throw AppError.notFound('Book not found');
    }
  }
}

// Singleton — one instance shared across the app
export const bookService = new BookService();
