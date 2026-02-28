import type { Request, Response } from 'express';
import type { Types } from 'mongoose';
import { borrowService } from '../services/borrow.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import type { IBorrowRecord } from '../models/BorrowRecord';

/**
 * POST /api/borrow/:bookId
 * Role: member
 *
 * Borrows a book. bookId comes from the URL param.
 * dueDate is calculated server-side from BORROW_DURATION_DAYS — never trusted from client.
 */
export const borrow = async (req: Request, res: Response): Promise<void> => {
  const { bookId } = req.params as { bookId: string };
  const userId = req.user!._id as Types.ObjectId;

  const result = await borrowService.borrow(bookId, userId);

  sendCreated(res, {
    borrowId: result.borrowId,
    dueDate: result.dueDate,
    message: `Book borrowed successfully. Due back by ${result.dueDate.toISOString().split('T')[0]}.`,
  });
};

/**
 * POST /api/borrow/return/:borrowId
 * Role: member
 *
 * Returns a borrowed book. The service enforces ownership (your borrow only).
 */
export const returnBook = async (req: Request, res: Response): Promise<void> => {
  const { borrowId } = req.params as { borrowId: string };
  const userId = req.user!._id as Types.ObjectId;

  const record = await borrowService.return(borrowId, userId);

  sendSuccess(res, { borrowRecord: record });
};

/**
 * GET /api/borrow/history
 * Role: member
 *
 * Returns the authenticated member's own borrow history.
 * Optional query: ?status=borrowed|returned|overdue&page=1&limit=10
 */
export const myHistory = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!._id as Types.ObjectId;

  const status =
    typeof req.query.status === 'string'
      ? (req.query.status as IBorrowRecord['status'])
      : undefined;

  const pagination = parsePagination(req);
  const result = await borrowService.myHistory(userId, { status }, pagination);

  sendSuccess(res, result);
};

/**
 * GET /api/admin/borrow
 * Role: admin | librarian
 *
 * Full borrow list with filters.
 * Optional query: ?status=borrowed|returned|overdue&overdue=true&userId=...&bookId=...&page=1&limit=10
 */
export const adminList = async (req: Request, res: Response): Promise<void> => {
  const status =
    typeof req.query.status === 'string'
      ? (req.query.status as IBorrowRecord['status'])
      : undefined;
  const overdue = req.query.overdue === 'true';
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  const bookId = typeof req.query.bookId === 'string' ? req.query.bookId : undefined;

  const pagination = parsePagination(req);
  const result = await borrowService.adminList({ status, overdue, userId, bookId }, pagination);

  sendSuccess(res, result);
};
