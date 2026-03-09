import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { listBooksQuerySchema, semanticSearchSchema } from '../utils/validationSchemas';
import { uploadBookFile } from '../middleware/upload';
import * as bookController from '../controllers/book.controller';

const router = Router();

/**
 * All book routes require authentication.
 * Role restrictions are applied per-route below.
 *
 * POST   /books          — admin, librarian  (multipart/form-data with optional file)
 * GET    /books          — any authenticated user
 * GET    /books/:id      — any authenticated user
 * PATCH  /books/:id      — admin, librarian  (multipart/form-data with optional file)
 * DELETE /books/:id      — admin only
 * GET    /books/:id/file — any authenticated user (download associated file)
 * DELETE /books/:id/file — admin, librarian   (remove file without deleting book)
 */

router.post(
  '/',
  authenticate,
  requireRole(['admin', 'librarian']),
  uploadBookFile,
  asyncHandler(bookController.create),
);

router.get(
  '/',
  authenticate,
  validate(listBooksQuerySchema, 'query'),
  asyncHandler(bookController.list),
);

/**
 * POST /api/books/semantic-search
 * Any authenticated user may search.
 * Registered before /:id so the literal path takes priority.
 */
router.post(
  '/semantic-search',
  authenticate,
  validate(semanticSearchSchema),
  asyncHandler(bookController.semanticSearch),
);

router.get('/:id', authenticate, asyncHandler(bookController.getById));

router.patch(
  '/:id',
  authenticate,
  requireRole(['admin', 'librarian']),
  uploadBookFile,
  asyncHandler(bookController.update),
);

router.delete('/:id', authenticate, requireRole(['admin']), asyncHandler(bookController.remove));

/**
 * GET /api/books/:id/file — download the associated PDF/HTML file.
 * Any authenticated user can download (the book content is public).
 */
router.get('/:id/file', authenticate, asyncHandler(bookController.downloadFile));

/**
 * DELETE /api/books/:id/file — remove the file without deleting the book.
 * Admin + librarian only.
 */
router.delete(
  '/:id/file',
  authenticate,
  requireRole(['admin', 'librarian']),
  asyncHandler(bookController.deleteFile),
);

export default router;
