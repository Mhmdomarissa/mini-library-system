import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { asyncHandler } from '../utils/asyncHandler';
import * as borrowController from '../controllers/borrow.controller';

const router = Router();

// All admin routes require authentication + elevated role
router.use(authenticate, requireRole(['admin', 'librarian']));

/**
 * GET /api/admin/borrow
 * Role: admin | librarian
 * View all borrow records with optional filtering.
 *
 * Query params:
 *   status=borrowed|returned|overdue
 *   overdue=true          (borrowed + past dueDate)
 *   userId=<objectId>
 *   bookId=<objectId>
 *   page=1  limit=10
 */
router.get('/borrow', asyncHandler(borrowController.adminList));

export default router;
