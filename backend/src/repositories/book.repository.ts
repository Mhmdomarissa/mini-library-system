import type { FilterQuery, Types } from 'mongoose';
import { Book } from '../models/Book';
import type { IBook, BookStatus } from '../models/Book';
import type { CreateBookInput, UpdateBookInput } from '../utils/validationSchemas';
import type { PaginationParams, PaginatedResult } from '../utils/pagination';
import { buildPaginationMeta } from '../utils/pagination';

export interface BookFilters {
  search?: string;
  genre?: string;
  status?: BookStatus;
}

/**
 * BookRepository — pure DB access only.
 * No business logic, no HTTP, no validation.
 * isDeleted: false is ALWAYS applied here — never rely on callers to filter it.
 */
export class BookRepository {
  /**
   * Create a new book document.
   */
  async create(data: CreateBookInput, createdBy: Types.ObjectId): Promise<IBook> {
    return Book.create({
      ...data,
      availableCopies: data.totalCopies,
      createdBy,
      updatedBy: createdBy,
    });
  }

  /**
   * Find a single non-deleted book by its MongoDB _id.
   * Returns null if not found or soft-deleted.
   */
  async findById(id: string): Promise<IBook | null> {
    return Book.findOne({ _id: id, isDeleted: false });
  }

  /**
   * Find a single non-deleted book by ISBN.
   * Used for uniqueness checks in the service layer.
   */
  async findByIsbn(isbn: string): Promise<IBook | null> {
    return Book.findOne({ isbn, isDeleted: false });
  }

  /**
   * Paginated list with optional text search and field filters.
   * Always excludes soft-deleted documents.
   */
  async findWithFilters(
    filters: BookFilters,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<IBook>> {
    const query: FilterQuery<IBook> = { isDeleted: false };

    // Full-text search on title / author / description (weighted text index)
    if (filters.search?.trim()) {
      query.$text = { $search: filters.search.trim() };
    }

    if (filters.genre) {
      query.genre = filters.genre;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const [items, totalItems] = await Promise.all([
      Book.find(query)
        .skip(pagination.skip)
        .limit(pagination.limit)
        .sort(filters.search ? { score: { $meta: 'textScore' } } : { createdAt: -1 }),
      Book.countDocuments(query),
    ]);

    return {
      items,
      pagination: buildPaginationMeta(pagination.page, pagination.limit, totalItems),
    };
  }

  /**
   * Partial update — only fields provided in data are changed.
   * Returns the updated document, or null if not found / soft-deleted.
   */
  async updateById(
    id: string,
    data: UpdateBookInput & { updatedBy: Types.ObjectId },
  ): Promise<IBook | null> {
    return Book.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true },
    );
  }

  /**
   * Soft delete — sets isDeleted + deletedAt, never removes the document.
   * Returns the updated document, or null if already deleted / not found.
   */
  async softDelete(id: string, deletedBy: Types.ObjectId): Promise<IBook | null> {
    return Book.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), updatedBy: deletedBy } },
      { new: true },
    );
  }
}

// Singleton — one instance shared across the app
export const bookRepository = new BookRepository();
