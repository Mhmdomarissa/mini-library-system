import type { Request, Response } from 'express';
import { bookService } from '../services/book.service';
import type { CreateBookInput, UpdateBookInput, ListBooksQuery } from '../utils/validationSchemas';
import { sendSuccess, sendCreated } from '../utils/response';
import type { BookFilters } from '../repositories/book.repository';

/**
 * BookController — HTTP layer only.
 * Reads req, calls service, sends response.
 * Zero business logic. Zero DB access.
 * Each method is a plain async function — wrapped with asyncHandler in routes.
 */

export const create = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as CreateBookInput;
  const book = await bookService.create(body, req.user!._id);
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
  sendSuccess(res, { books: result.items, pagination: result.pagination });
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const book = await bookService.getById(id);
  sendSuccess(res, { book });
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const body = req.body as UpdateBookInput;
  const book = await bookService.update(id, body, req.user!._id);
  sendSuccess(res, { book });
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  await bookService.softDelete(id, req.user!._id);
  sendSuccess(res, null);
};
