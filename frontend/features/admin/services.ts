import { api } from '@/lib/api';
import type { BorrowRecord, PaginatedResponse } from '@/types';

export const adminService = {
  getAllBorrows: (page = 1, limit = 20): Promise<PaginatedResponse<BorrowRecord>> =>
    api.get(`/api/borrow/admin/all?page=${page}&limit=${limit}`),

  getOverdue: (): Promise<BorrowRecord[]> =>
    api.get('/api/borrow/admin/overdue'),
};
