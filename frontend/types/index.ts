// ── Roles ──────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'librarian' | 'member';

// ── Domain models ──────────────────────────────────────────────────────────────

export interface User {
  _id: string;
  firebaseUid: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  isbn: string;
  genre: string;
  description: string;
  publishedYear: number;
  totalCopies: number;
  availableCopies: number;
  status: 'available' | 'out_of_stock' | 'archived';
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type BorrowStatus = 'borrowed' | 'returned' | 'overdue';

export interface BorrowRecord {
  _id: string;
  userId: string | User;
  bookId: string | Book;
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string;
  status: BorrowStatus;
  /** Dynamically computed — not persisted in DB */
  computedStatus?: string;
  /** Days overdue — computed at query time */
  daysOverdue?: number;
  /** Fine amount — computed at query time */
  fine?: number;
  createdAt: string;
  updatedAt: string;
}

// ── API response shapes ────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

// ── Form / request payloads ────────────────────────────────────────────────────

export interface LoginForm {
  email: string;
  password: string;
}

export interface CreateBookPayload {
  title: string;
  author: string;
  isbn: string;
  genre: string;
  publishedYear: number;
  totalCopies: number;
  description?: string;
}

export type UpdateBookPayload = Partial<CreateBookPayload>;

// ── Chat ───────────────────────────────────────────────────────────────────────

export interface ChatSource {
  id: string;
  title: string;
  author: string;
  genre: string;
}

/** A single turn in the chat conversation (tracked client-side only) */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  timestamp: Date;
}

/** Shape of data returned by POST /api/chat */
export interface ChatApiResponse {
  reply: string;
  sources: ChatSource[];
}
