import type { ClientSession, Types } from 'mongoose';
import { BorrowRecord } from '../models/BorrowRecord';
import type { IBorrowRecord, BorrowStatus } from '../models/BorrowRecord';
import type { PaginationParams, PaginatedResult } from '../utils/pagination';
import { buildPaginationMeta } from '../utils/pagination';

export interface BorrowFilters {
  userId?: string;
  bookId?: string;
  status?: BorrowStatus;
  /** When true, return only records that are borrowed AND past dueDate */
  overdue?: boolean;
}

/**
 * BorrowRepository — pure DB access for BorrowRecord collection.
 * All transaction-involved writes receive a ClientSession from the service.
 */
export class BorrowRepository {
  /**
   * Check whether a user already has an active (status='borrowed') record
   * for a given book. Used inside the borrow transaction to prevent duplicates.
   */
  async findActiveBorrow(
    userId: Types.ObjectId,
    bookId: Types.ObjectId,
    session: ClientSession,
  ): Promise<IBorrowRecord | null> {
    return BorrowRecord.findOne({ userId, bookId, status: 'borrowed' }).session(session);
  }

  /**
   * Create a new BorrowRecord inside a transaction.
   */
  async create(
    data: {
      userId: Types.ObjectId;
      bookId: Types.ObjectId;
      borrowedAt: Date;
      dueDate: Date;
    },
    session: ClientSession,
  ): Promise<IBorrowRecord> {
    // Model.create() with session must receive an array
    const [record] = await BorrowRecord.create([data], { session });
    return record;
  }

  /**
   * Find a BorrowRecord by its _id.
   */
  async findById(id: string): Promise<IBorrowRecord | null> {
    return BorrowRecord.findById(id).populate('bookId', 'title author isbn');
  }

  /**
   * Find a BorrowRecord by its _id inside a transaction.
   */
  async findByIdWithSession(id: string, session: ClientSession): Promise<IBorrowRecord | null> {
    return BorrowRecord.findById(id).session(session);
  }

  /**
   * Mark a borrow record as returned inside a transaction.
   */
  async markReturned(id: string, session: ClientSession): Promise<IBorrowRecord | null> {
    return BorrowRecord.findByIdAndUpdate(
      id,
      { $set: { status: 'returned', returnedAt: new Date() } },
      { returnDocument: 'after', session },
    );
  }

  /**
   * Paginated list for member history or admin view.
   * Dynamically treats borrowed+overdue records as 'overdue' in the response.
   */
  async findWithFilters(
    filters: BorrowFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<IBorrowRecord>> {
    const query: Record<string, unknown> = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.bookId) query.bookId = filters.bookId;

    if (filters.overdue) {
      // Overdue = borrowed AND past dueDate
      query.status = 'borrowed';
      query.dueDate = { $lt: new Date() };
    } else if (filters.status) {
      query.status = filters.status;
    }

    const [items, totalItems] = await Promise.all([
      BorrowRecord.find(query)
        .populate('bookId', 'title author isbn genre')
        .populate('userId', 'email displayName')
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      BorrowRecord.countDocuments(query),
    ]);

    // Dynamically resolve overdue status without mutating the DB document
    const enriched = items.map((record) => {
      const obj = record.toObject() as IBorrowRecord & { computedStatus?: string };
      if (obj.status === 'borrowed' && obj.dueDate < new Date()) {
        obj.computedStatus = 'overdue';
      } else {
        obj.computedStatus = obj.status;
      }
      return obj;
    });

    return {
      items: enriched as unknown as IBorrowRecord[],
      pagination: buildPaginationMeta(pagination.page, pagination.limit, totalItems),
    };
  }
}

export const borrowRepository = new BorrowRepository();
