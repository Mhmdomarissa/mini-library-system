import { useQuery } from '@tanstack/react-query';
import { adminService } from '../services';
import { borrowKeys } from '@/features/borrow';

export function useAdminBorrows(page = 1) {
  return useQuery({
    queryKey: borrowKeys.adminAll(page),
    queryFn: () => adminService.getAllBorrows(page),
  });
}

export function useOverdueBorrows() {
  return useQuery({
    queryKey: ['borrow', 'overdue'],
    queryFn: () => adminService.getOverdue(),
  });
}
