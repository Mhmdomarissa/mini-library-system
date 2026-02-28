import { z } from 'zod';

export const listBooksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().optional(),
  genre: z.string().optional(),
  status: z.enum(['available', 'out_of_stock', 'archived']).optional(),
});

export type ListBooksQuery = z.infer<typeof listBooksQuerySchema>;

export const createBookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  isbn: z.string().min(10, 'ISBN must be at least 10 characters'),
  genre: z.string().min(1, 'Genre is required'),
  description: z.string().optional().default(''),
  publishedYear: z.number().int().min(1000).max(new Date().getFullYear()),
  totalCopies: z.number().int().min(1, 'Must have at least 1 copy'),
});

export const updateBookSchema = createBookSchema.partial();

// ── Borrow ─────────────────────────────────────────────────────────────────
// No request body for borrow — bookId comes from URL param (:bookId)
// No request body for return — borrowId comes from URL param (:borrowId)

// GET /api/borrow/history  — member's own borrow history
export const listBorrowsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  status: z.enum(['borrowed', 'returned', 'overdue']).optional(),
});

// GET /api/admin/borrow — admin/librarian view
export const adminListBorrowsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  status: z.enum(['borrowed', 'returned', 'overdue']).optional(),
  overdue: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  userId: z.string().optional(),
  bookId: z.string().optional(),
});

// ── Semantic search ────────────────────────────────────────────────────────
export const semanticSearchSchema = z.object({
  // Non-empty string required — 400 if missing or blank
  query: z.string().min(1, 'query is required'),
  // 1–20 inclusive; service also enforces max=20 for defence-in-depth
  limit: z.number().int().min(1).max(20).optional().default(5),
});

// ── User management (admin) ────────────────────────────────────────────────
export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'librarian', 'member']),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type ListBorrowsQuery = z.infer<typeof listBorrowsQuerySchema>;
export type AdminListBorrowsQuery = z.infer<typeof adminListBorrowsQuerySchema>;
export type SemanticSearchInput = z.infer<typeof semanticSearchSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

// ── Chat ───────────────────────────────────────────────────────────────────
export const chatSchema = z.object({
  message: z
    .string()
    .min(1, 'message is required')
    .max(1000, 'message must be at most 1000 characters'),
});

export type ChatInput = z.infer<typeof chatSchema>;
