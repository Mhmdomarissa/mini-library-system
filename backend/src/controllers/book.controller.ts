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
  const { page, limit, search, genre, status } = req.query as unknown as ListBooksQuery;

  const filters: BookFilters = { search, genre, status };
  const pagination = { page, limit, skip: (page - 1) * limit };

  const result = await bookService.list(filters, pagination);

  sendSuccess(res, { books: result.items, pagination: result.pagination });
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const book = await bookService.getById(req.params.id);
  sendSuccess(res, { book });
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as UpdateBookInput;
  const book = await bookService.update(req.params.id, body, req.user!._id);
  sendSuccess(res, { book });
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  await bookService.softDelete(req.params.id, req.user!._id);
  sendSuccess(res, null);
};
