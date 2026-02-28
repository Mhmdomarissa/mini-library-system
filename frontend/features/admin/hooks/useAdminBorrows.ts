import { useQuery } from '@tanstack/react-query';
import { adminService, type AdminBorrowQuery } from '../services';

export const adminBorrowKeys = {
  all: ['admin-borrows'] as const,
  list: (query: AdminBorrowQuery) => [...adminBorrowKeys.all, 'list', query] as const,
};

export function useAdminBorrows(query: AdminBorrowQuery = {}) {
  return useQuery({
    queryKey: adminBorrowKeys.list(query),
    queryFn: () => adminService.getAllBorrows(query),
  });
}
