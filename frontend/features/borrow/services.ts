import { api } from '@/lib/api';
import type { BorrowRecord, PaginatedResponse } from '@/types';

export const borrowService = {
  // POST /api/borrow/:bookId
  borrowBook: (bookId: string): Promise<BorrowRecord> =>
    api.post(`/api/borrow/${bookId}`, {}),

  // POST /api/borrow/return/:borrowId
  returnBook: (borrowId: string): Promise<BorrowRecord> =>
    api.post(`/api/borrow/return/${borrowId}`, {}),

  // GET /api/borrow/history
  myHistory: (page = 1, limit = 10): Promise<PaginatedResponse<BorrowRecord>> =>
    api.get(`/api/borrow/history?page=${page}&limit=${limit}`),
};
