import { useQuery } from '@tanstack/react-query';
import { bookService, type BookQuery } from '../services';

export const bookKeys = {
  all: ['books'] as const,
  list: (query: BookQuery) => [...bookKeys.all, 'list', query] as const,
  detail: (id: string) => [...bookKeys.all, 'detail', id] as const,
  semantic: (q: string) => [...bookKeys.all, 'semantic', q] as const,
};

export function useBooks(query: BookQuery = {}) {
  return useQuery({
    queryKey: bookKeys.list(query),
    queryFn: () => bookService.getAll(query),
  });
}

export function useBook(id: string) {
  return useQuery({
    queryKey: bookKeys.detail(id),
    queryFn: () => bookService.getById(id),
    enabled: Boolean(id),
  });
}

export function useSemanticSearch(q: string) {
  return useQuery({
    queryKey: bookKeys.semantic(q),
    queryFn: () => bookService.semanticSearch(q),
    enabled: q.length >= 3,
  });
}
