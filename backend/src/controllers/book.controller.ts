import type { Request, Response } from 'express';
import { bookService } from '../services/book.service';
import type { FilePayload } from '../services/book.service';
import type {
  CreateBookInput,
  UpdateBookInput,
  ListBooksQuery,
  SemanticSearchInput,
} from '../utils/validationSchemas';
import { sendSuccess, sendCreated } from '../utils/response';
import type { BookFilters } from '../repositories/book.repository';

/**
 * BookController — HTTP layer only.
 * Reads req, calls service, sends response.
 * Zero business logic. Zero DB access.
 * Each method is a plain async function — wrapped with asyncHandler in routes.
 */

/**
 * Extract a FilePayload from the multer-processed request, if present.
 */
function extractFile(req: Request): FilePayload | undefined {
  const file = (req as unknown as { file?: Express.Multer.File }).file;
  if (!file) return undefined;
  return {
    buffer: file.buffer,
    originalname: file.originalname,
    mimetype: file.mimetype,
  };
}

/**
 * Parse multipart/form-data body fields.
 * When using multer, text fields arrive as strings.
 * Numeric fields need to be coerced explicitly.
 */
function parseBookBody(body: Record<string, unknown>): CreateBookInput {
  return {
    title: String(body.title ?? ''),
    author: String(body.author ?? ''),
    isbn: String(body.isbn ?? ''),
    genre: String(body.genre ?? ''),
    description: body.description ? String(body.description) : '',
    publishedYear: Number(body.publishedYear),
    totalCopies: Number(body.totalCopies),
  } as CreateBookInput;
}

export const create = async (req: Request, res: Response): Promise<void> => {
  const body = parseBookBody(req.body as Record<string, unknown>);
  const file = extractFile(req);
  const book = await bookService.create(body, req.user!._id, file);
  sendCreated(res, { book });
};

export const list = async (req: Request, res: Response): Promise<void> => {
  // req.query is a getter in Express and is not writable, so we parse
  // directly rather than relying on the Zod middleware having replaced it.
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const genre = typeof req.query.genre === 'string' ? req.query.genre : undefined;
  const status =
    typeof req.query.status === 'string'
      ? (req.query.status as ListBooksQuery['status'])
      : undefined;

  const filters: BookFilters = { search, genre, status };
  const pagination = { page, limit, skip: (page - 1) * limit };

  const result = await bookService.list(filters, pagination);
  sendSuccess(res, result);
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const book = await bookService.getById(id);
  sendSuccess(res, { book });
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  // When multer is active, body fields are strings. Parse numeric fields.
  const raw = req.body as Record<string, unknown>;
  const body: UpdateBookInput = {};
  if (raw.title !== undefined) body.title = String(raw.title);
  if (raw.author !== undefined) body.author = String(raw.author);
  if (raw.isbn !== undefined) body.isbn = String(raw.isbn);
  if (raw.genre !== undefined) body.genre = String(raw.genre);
  if (raw.description !== undefined) body.description = String(raw.description);
  if (raw.publishedYear !== undefined) body.publishedYear = Number(raw.publishedYear);
  if (raw.totalCopies !== undefined) body.totalCopies = Number(raw.totalCopies);

  const file = extractFile(req);
  const book = await bookService.update(id, body, req.user!._id, file);
  sendSuccess(res, { book });
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  await bookService.softDelete(id, req.user!._id);
  sendSuccess(res, null);
};

/**
 * POST /api/books/semantic-search
 * Body: { query: string, limit?: number }
 *
 * Returns books ranked by cosine similarity to the query embedding.
 * Embedding vectors are NEVER included in the response.
 * 400 if query missing or limit > 20.
 * 503 if OpenAI is unavailable.
 */
export const semanticSearch = async (req: Request, res: Response): Promise<void> => {
  const { query, limit } = req.body as SemanticSearchInput;
  const books = await bookService.semanticSearch(query, limit);
  sendSuccess(res, books);
};

/**
 * GET /api/books/:id/file
 * Download the file (PDF/HTML) associated with a book.
 * Streams the file directly from GridFS — no temp files.
 */
export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { stream, filename, contentType } = await bookService.downloadFile(id);

  res.set({
    'Content-Type': contentType,
    'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
  });

  (stream as NodeJS.ReadableStream).pipe(res);
};

/**
 * DELETE /api/books/:id/file
 * Remove the file associated with a book (admin/librarian only).
 * Does NOT delete the book itself.
 */
export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const book = await bookService.deleteFile(id, req.user!._id);
  sendSuccess(res, { book });
};
