import { useMutation, useQueryClient } from '@tanstack/react-query';
import { borrowService } from '../services';
import type { BorrowHistoryQuery } from '../services';

export const borrowKeys = {
  all: ['borrow'] as const,
  myHistory: (query: BorrowHistoryQuery) => [...borrowKeys.all, 'history', query] as const,
};

export function useBorrowBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) => borrowService.borrowBook(bookId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['books'] });
      qc.invalidateQueries({ queryKey: borrowKeys.all });
    },
  });
}

export function useReturnBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (borrowId: string) => borrowService.returnBook(borrowId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['books'] });
      qc.invalidateQueries({ queryKey: borrowKeys.all });
    },
  });
}
