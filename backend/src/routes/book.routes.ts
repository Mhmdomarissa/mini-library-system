import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createBookSchema,
  updateBookSchema,
  listBooksQuerySchema,
} from '../utils/validationSchemas';
import * as bookController from '../controllers/book.controller';

const router = Router();

/**
 * All book routes require authentication.
 * Role restrictions are applied per-route below.
 *
 * POST   /books          — admin, librarian
 * GET    /books          — any authenticated user
 * GET    /books/:id      — any authenticated user
 * PATCH  /books/:id      — admin, librarian
 * DELETE /books/:id      — admin only
 */

router.post(
  '/',
  authenticate,
  requireRole(['admin', 'librarian']),
  validate(createBookSchema),
  asyncHandler(bookController.create),
);

router.get(
  '/',
  authenticate,
  validate(listBooksQuerySchema, 'query'),
  asyncHandler(bookController.list),
);

router.get('/:id', authenticate, asyncHandler(bookController.getById));

router.patch(
  '/:id',
  authenticate,
  requireRole(['admin', 'librarian']),
  validate(updateBookSchema),
  asyncHandler(bookController.update),
);

router.delete('/:id', authenticate, requireRole(['admin']), asyncHandler(bookController.remove));

export default router;
