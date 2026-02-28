import { api } from '@/lib/api';
import type { BorrowRecord, PaginatedResponse } from '@/types';

export interface AdminBorrowQuery {
  page?: number;
  limit?: number;
  status?: 'borrowed' | 'returned' | 'overdue';
  overdue?: boolean;
  userId?: string;
  bookId?: string;
}

function buildQS(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export const adminService = {
  getAllBorrows: (query: AdminBorrowQuery = {}): Promise<PaginatedResponse<BorrowRecord>> => {
    const { page = 1, limit = 20, ...filters } = query;
    return api.get(`/api/admin/borrow${buildQS({ page, limit, ...filters })}`);
  },
};
