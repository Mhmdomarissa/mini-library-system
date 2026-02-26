import type { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/**
 * Extract and sanitize pagination params from req.query.
 *
 * Usage in controller:
 *   const { page, limit, skip } = parsePagination(req);
 *   const books = await Book.find(filter).skip(skip).limit(limit);
 *   return buildPaginationMeta(page, limit, totalCount);
 */
export const parsePagination = (req: Request): PaginationParams => {
  const rawPage = parseInt(String(req.query.page ?? DEFAULT_PAGE), 10);
  const rawLimit = parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10);

  const page = isNaN(rawPage) || rawPage < 1 ? DEFAULT_PAGE : rawPage;
  const limit = isNaN(rawLimit) || rawLimit < 1 ? DEFAULT_LIMIT : Math.min(rawLimit, MAX_LIMIT);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build the pagination metadata object for the response envelope.
 *
 * Usage:
 *   const pagination = buildPaginationMeta(page, limit, totalCount);
 *   sendSuccess(res, { books, pagination });
 */
export const buildPaginationMeta = (
  page: number,
  limit: number,
  totalItems: number,
): PaginationMeta => {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};
