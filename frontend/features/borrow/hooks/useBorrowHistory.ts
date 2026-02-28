import { useQuery } from '@tanstack/react-query';
import { borrowService } from '../services';
import { borrowKeys } from './useBorrow';

export function useBorrowHistory(page = 1) {
  return useQuery({
    queryKey: borrowKeys.myHistory(page),
    queryFn: () => borrowService.myHistory(page),
  });
}
