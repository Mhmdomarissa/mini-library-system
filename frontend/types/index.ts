// ── Roles ──────────────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin';

// ── Domain models ──────────────────────────────────────────────────────────────

export interface User {
  _id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  isbn: string;
  genre: string;
  publishedYear: number;
  totalCopies: number;
  availableCopies: number;
  description?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type BorrowStatus = 'active' | 'returned' | 'overdue';

export interface BorrowRecord {
  _id: string;
  userId: string | User;
  bookId: string | Book;
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string;
  status: BorrowStatus;
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
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
