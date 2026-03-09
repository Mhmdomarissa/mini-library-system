import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookService } from '../services';
import { bookKeys } from './useBooks';
import type { CreateBookPayload, UpdateBookPayload } from '@/types';

export function useCreateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, file }: { payload: CreateBookPayload; file?: File }) =>
      bookService.create(payload, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.all }),
  });
}

export function useUpdateBook(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, file }: { payload: UpdateBookPayload; file?: File }) =>
      bookService.update(id, payload, file),
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

export function useDeleteBookFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) => bookService.deleteFile(bookId),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookKeys.all }),
  });
}
