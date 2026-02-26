import type { Types } from 'mongoose';
import { bookRepository } from '../repositories/book.repository';
import type { BookFilters } from '../repositories/book.repository';
import type { IBook } from '../models/Book';
import type { CreateBookInput, UpdateBookInput } from '../utils/validationSchemas';
import type { PaginationParams, PaginatedResult } from '../utils/pagination';
import { AppError } from '../utils/AppError';

/**
 * BookService — business rules only.
 * Calls bookRepository for DB access.
 * Throws AppError for rule violations.
 * Has zero knowledge of Express (no req/res).
 */
export class BookService {
  /**
   * Create a book after enforcing ISBN uniqueness.
   * availableCopies is derived from totalCopies — never trusted from input.
   */
  async create(data: CreateBookInput, createdBy: Types.ObjectId): Promise<IBook> {
    const existing = await bookRepository.findByIsbn(data.isbn);
    if (existing) {
      throw AppError.conflict(`A book with ISBN "${data.isbn}" already exists`);
    }

    return bookRepository.create(data, createdBy);
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

    const updated = await bookRepository.updateById(id, {
      ...data,
      ...(safeAvailable !== currentAvailable && { availableCopies: safeAvailable }),
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
