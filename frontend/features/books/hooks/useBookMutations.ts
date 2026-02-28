import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookService } from '../services';
import { bookKeys } from './useBooks';
import type { CreateBookPayload, UpdateBookPayload } from '@/types';

export function useCreateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBookPayload) => bookService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.all }),
  });
}

export function useUpdateBook(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBookPayload) => bookService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookKeys.all });
    },
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.all }),
  });
}
