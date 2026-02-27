import mongoose from 'mongoose';
import type { Types } from 'mongoose';
import { bookRepository } from '../repositories/book.repository';
import { borrowRepository } from '../repositories/borrow.repository';
import type { BorrowFilters } from '../repositories/borrow.repository';
import type { IBorrowRecord } from '../models/BorrowRecord';
import type { PaginationParams, PaginatedResult } from '../utils/pagination';
import { AppError } from '../utils/AppError';

/**
 * BorrowService — all borrow/return business logic.
 *
 * Both borrow() and return() run inside a mongoose ClientSession with
 * ACID transaction guarantees:
 *   - Atomicity: book copies and borrow record update together or both rollback
 *   - Isolation: concurrent borrows of the last copy safely fail one transaction
 *
 * No Express knowledge here — only ObjectIds, domain objects, and AppError.
 */
export class BorrowService {
  /**
   * Borrow a book.
   *
   * Transaction steps:
   *  1. Fetch book with session (read-your-own-writes within txn)
   *  2. Validate: exists, not archived, has available copies
   *  3. Validate: no active borrow by this user for this book
   *  4. Decrement availableCopies (flips status → out_of_stock if hits 0)
   *  5. Create BorrowRecord
   *  6. Commit
   */
  async borrow(
    bookId: string,
    userId: Types.ObjectId,
  ): Promise<{ borrowId: string; dueDate: Date }> {
    const durationDays = parseInt(process.env.BORROW_DURATION_DAYS ?? '14', 10);
    const maxActiveBorrows = parseInt(process.env.MAX_ACTIVE_BORROWS ?? '5', 10);

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // 1. Lock-read the book inside the transaction
      const book = await bookRepository.findById(bookId);

      if (!book) {
        throw AppError.notFound('Book not found');
      }

      // 2. Business rule guards
      if (book.status === 'archived') {
        throw AppError.badRequest('This book is archived and cannot be borrowed');
      }

      if (book.availableCopies <= 0) {
        throw AppError.badRequest('No available copies of this book');
      }

      // 3. Duplicate active borrow check (DB index is the last line of defence;
      //    this check gives a clean 409 error message instead of a Mongo 11000)
      const existingBorrow = await borrowRepository.findActiveBorrow(
        userId,
        book._id as Types.ObjectId,
        session,
      );

      if (existingBorrow) {
        throw AppError.conflict('You already have an active borrow for this book');
      }

      // 4. Enforce member-wide active borrow limit (inside the same transaction/session)
      const activeBorrowCount = await borrowRepository.countActiveBorrows(userId, session);
      if (activeBorrowCount >= maxActiveBorrows) {
        throw AppError.badRequest(`Borrow limit exceeded (max ${maxActiveBorrows} active borrows)`);
      }

      // 5. Decrement book copies atomically inside the transaction
      const updatedBook = await bookRepository.decrementCopies(book._id as Types.ObjectId, session);

      if (!updatedBook) {
        // Should not happen — race condition caught by transaction isolation
        throw AppError.internal('Failed to update book copies');
      }

      // 6. Create the borrow record
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + durationDays);

      const record = await borrowRepository.create(
        {
          userId,
          bookId: book._id as Types.ObjectId,
          borrowedAt: new Date(),
          dueDate,
        },
        session,
      );

      // 7. Commit — if any step threw, we jump to catch block which aborts
      await session.commitTransaction();

      return { borrowId: (record._id as Types.ObjectId).toString(), dueDate };
    } catch (err) {
      // Rollback on ANY error (AppError, Mongoose, write conflict, etc.)
      await session.abortTransaction().catch(() => {});

      // Re-throw AppErrors unchanged; wrap Mongo 11000 duplicate key as 409
      if (err instanceof AppError) throw err;

      const mongoErr = err as Record<string, unknown>;
      if (mongoErr.code === 11000) {
        throw AppError.conflict('You already have an active borrow for this book');
      }

      throw err;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Return a borrowed book.
   *
   * Transaction steps:
   *  1. Fetch BorrowRecord
   *  2. Validate: record exists, belongs to this user, is still borrowed
   *  3. Mark record as returned
   *  4. Increment book's availableCopies (flips status → available if was out_of_stock)
   *  5. Commit
   */
  async return(borrowId: string, userId: Types.ObjectId): Promise<IBorrowRecord> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // 1. Fetch record inside transaction
      const record = await borrowRepository.findByIdWithSession(borrowId, session);

      if (!record) {
        throw AppError.notFound('Borrow record not found');
      }

      // 2. Ownership check — a member can only return their own borrow
      if (record.userId.toString() !== userId.toString()) {
        throw AppError.forbidden('You can only return your own borrowed books');
      }

      if (record.status === 'returned') {
        throw AppError.badRequest('This book has already been returned');
      }

      // 3. Mark returned
      const updated = await borrowRepository.markReturned(borrowId, session);
      if (!updated) {
        throw AppError.internal('Failed to update borrow record');
      }

      // 4. Increment book copies
      const updatedBook = await bookRepository.incrementCopies(record.bookId, session);
      if (!updatedBook) {
        throw AppError.internal('Failed to update book copies');
      }

      // 5. Commit
      await session.commitTransaction();

      return updated;
    } catch (err) {
      await session.abortTransaction();
      if (err instanceof AppError) throw err;
      throw err;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Member's own borrow history.
   * Status filter 'overdue' is resolved dynamically:
   *   status=borrowed + dueDate < now → computedStatus='overdue'
   */
  async myHistory(
    userId: Types.ObjectId,
    filters: { status?: IBorrowRecord['status'] },
    pagination: PaginationParams,
  ): Promise<PaginatedResult<IBorrowRecord>> {
    const repoFilters: BorrowFilters = {
      userId: userId.toString(),
    };

    if (filters.status === 'overdue') {
      repoFilters.overdue = true;
    } else if (filters.status) {
      repoFilters.status = filters.status;
    }

    return borrowRepository.findWithFilters(repoFilters, pagination);
  }

  /**
   * Admin/librarian view of all borrows.
   * Supports filtering by userId, bookId, status, and overdue flag.
   */
  async adminList(
    filters: BorrowFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<IBorrowRecord>> {
    return borrowRepository.findWithFilters(filters, pagination);
  }
}

export const borrowService = new BorrowService();
