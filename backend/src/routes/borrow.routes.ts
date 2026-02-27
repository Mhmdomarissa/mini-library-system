import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { asyncHandler } from '../utils/asyncHandler';
import * as borrowController from '../controllers/borrow.controller';

const router = Router();

// All borrow routes require authentication
router.use(authenticate);

/**
 * POST /api/borrow/:bookId
 * Role: member
 * Borrow a book. dueDate is computed server-side (BORROW_DURATION_DAYS).
 *
 * NOTE: `/return/:borrowId` MUST be registered BEFORE `/:bookId`
 * so Express does not mistake "return" for a bookId value.
 */
router.post(
  '/return/:borrowId',
  requireRole(['member', 'admin', 'librarian']),
  asyncHandler(borrowController.returnBook),
);

router.post('/:bookId', requireRole(['member']), asyncHandler(borrowController.borrow));

/**
 * GET /api/borrow/history
 * Role: member
 * Return the authenticated user's own borrow history.
 * Optional query params: status, page, limit
 */
router.get(
  '/history',
  requireRole(['member', 'admin', 'librarian']),
  asyncHandler(borrowController.myHistory),
);

export default router;
