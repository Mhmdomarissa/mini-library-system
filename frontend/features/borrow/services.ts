import { api } from '@/lib/api';
import type { BorrowRecord, PaginatedResponse } from '@/types';

export const borrowService = {
  borrowBook: (bookId: string): Promise<BorrowRecord> =>
    api.post('/api/borrow', { bookId }),

  returnBook: (borrowId: string): Promise<BorrowRecord> =>
    api.patch(`/api/borrow/${borrowId}/return`, {}),

  myHistory: (page = 1, limit = 10): Promise<PaginatedResponse<BorrowRecord>> =>
    api.get(`/api/borrow/my?page=${page}&limit=${limit}`),
};
