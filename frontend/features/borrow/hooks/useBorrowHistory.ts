import { useQuery } from '@tanstack/react-query';
import { borrowService, type BorrowHistoryQuery } from '../services';
import { borrowKeys } from './useBorrow';

export function useBorrowHistory(query: BorrowHistoryQuery = {}) {
  return useQuery({
    queryKey: borrowKeys.myHistory(query),
    queryFn: () => borrowService.myHistory(query),
  });
}
