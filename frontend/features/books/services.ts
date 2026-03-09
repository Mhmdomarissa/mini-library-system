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

/**
 * Build a FormData instance from book payload + optional file.
 * Used for create and update — sends multipart/form-data so the
 * backend multer middleware can extract both text fields and the file.
 */
function buildFormData(payload: Record<string, unknown>, file?: File): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) {
      fd.append(key, String(value));
    }
  }
  if (file) {
    fd.append('file', file);
  }
  return fd;
}

export const bookService = {
  getAll: (query: BookQuery = {}): Promise<PaginatedResponse<Book>> =>
    api.get(`/api/books${buildQS(query as Record<string, string | number | undefined>)}`),

  getById: (id: string): Promise<Book> =>
    api.get<{ book: Book }>(`/api/books/${id}`).then((r) => r.book),

  // POST /api/books/semantic-search — body: { query, limit }
  semanticSearch: (q: string, limit = 10): Promise<Book[]> =>
    api.post('/api/books/semantic-search', { query: q, limit }),

  create: (payload: CreateBookPayload, file?: File): Promise<Book> =>
    api.postForm<{ book: Book }>('/api/books', buildFormData(payload as unknown as Record<string, unknown>, file)).then((r) => r.book),

  update: (id: string, payload: UpdateBookPayload, file?: File): Promise<Book> =>
    api.patchForm<{ book: Book }>(`/api/books/${id}`, buildFormData(payload as unknown as Record<string, unknown>, file)).then((r) => r.book),

  delete: (id: string): Promise<void> => api.delete(`/api/books/${id}`),

  deleteFile: (id: string): Promise<Book> =>
    api.delete<{ book: Book }>(`/api/books/${id}/file`).then((r) => r.book),

  /**
   * Download a book's file with authentication and open it in a new tab.
   * Creates a temporary blob URL so the browser can display the PDF/HTML.
   */
  openFile: async (bookId: string): Promise<void> => {
    const blob = await api.getBlob(`/api/books/${bookId}/file`);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Revoke after a short delay so the browser has time to load it
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
