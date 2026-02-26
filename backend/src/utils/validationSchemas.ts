import { z } from 'zod';

export const createBookSchema = z.object({
  title:         z.string().min(1, 'Title is required'),
  author:        z.string().min(1, 'Author is required'),
  isbn:          z.string().min(10, 'ISBN must be at least 10 characters'),
  genre:         z.string().min(1, 'Genre is required'),
  description:   z.string().optional().default(''),
  publishedYear: z.number().int().min(1000).max(new Date().getFullYear()),
  totalCopies:   z.number().int().min(1, 'Must have at least 1 copy'),
});

export const updateBookSchema = createBookSchema.partial();

export const borrowBookSchema = z.object({
  bookId:  z.string().min(1, 'Book ID is required'),
  dueDate: z.string().datetime({ message: 'Invalid due date format' }),
});

export const returnBookSchema = z.object({
  borrowRecordId: z.string().min(1, 'Borrow record ID is required'),
});

export type CreateBookInput  = z.infer<typeof createBookSchema>;
export type UpdateBookInput  = z.infer<typeof updateBookSchema>;
export type BorrowBookInput  = z.infer<typeof borrowBookSchema>;
export type ReturnBookInput  = z.infer<typeof returnBookSchema>;
