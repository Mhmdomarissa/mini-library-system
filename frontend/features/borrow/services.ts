import { api } from '@/lib/api';
import type { BorrowRecord, BorrowStatus, PaginatedResponse } from '@/types';

export interface BorrowHistoryQuery {
  page?: number;
  limit?: number;
  status?: BorrowStatus;
}

export const borrowService = {
  // POST /api/borrow/:bookId
  borrowBook: (bookId: string): Promise<{ borrowId: string; dueDate: string; message: string }> =>
    api.post(`/api/borrow/${bookId}`, {}),

  // POST /api/borrow/return/:borrowId
  returnBook: (borrowId: string): Promise<{ borrowRecord: BorrowRecord }> =>
    api.post(`/api/borrow/return/${borrowId}`, {}),

  // GET /api/borrow/history
  myHistory: (query: BorrowHistoryQuery = {}): Promise<PaginatedResponse<BorrowRecord>> => {
    const { page = 1, limit = 10, status } = query;
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    return api.get(`/api/borrow/history?${params.toString()}`);
  },
};
