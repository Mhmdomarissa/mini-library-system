import { useMutation, useQueryClient } from '@tanstack/react-query';
import { borrowService } from '../services';

export const borrowKeys = {
  all: ['borrow'] as const,
  myHistory: (page: number) => [...borrowKeys.all, 'history', page] as const,
  adminAll: (page: number) => [...borrowKeys.all, 'admin', page] as const,
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
