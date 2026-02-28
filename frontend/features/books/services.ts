import { api } from '@/lib/api';
import type {
  Book,
  CreateBookPayload,
  PaginatedResponse,
  UpdateBookPayload,
} from '@/types';

export interface BookQuery {
  page?: number;
  limit?: number;
  search?: string;
  genre?: string;
  status?: 'available' | 'out_of_stock' | 'archived';
}

function buildQS(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export const bookService = {
  getAll: (query: BookQuery = {}): Promise<PaginatedResponse<Book>> =>
    api.get(`/api/books${buildQS(query as Record<string, string | number | undefined>)}`),

  getById: (id: string): Promise<Book> =>
    api.get<{ book: Book }>(`/api/books/${id}`).then((r) => r.book),

  // POST /api/books/semantic-search — body: { query, limit }
  semanticSearch: (q: string, limit = 10): Promise<Book[]> =>
    api.post('/api/books/semantic-search', { query: q, limit }),

  create: (payload: CreateBookPayload): Promise<Book> =>
    api.post<{ book: Book }>('/api/books', payload).then((r) => r.book),

  update: (id: string, payload: UpdateBookPayload): Promise<Book> =>
    api.patch<{ book: Book }>(`/api/books/${id}`, payload).then((r) => r.book),

  delete: (id: string): Promise<void> => api.delete(`/api/books/${id}`),
};
