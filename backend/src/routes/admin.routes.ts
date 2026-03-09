import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { updateUserRoleSchema, updateUserStatusSchema } from '../utils/validationSchemas';
import * as borrowController from '../controllers/borrow.controller';
import * as userController from '../controllers/user.controller';
import * as seedController from '../controllers/seed.controller';

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

// ── User management (admin only) ────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Role: admin
 * List all users with optional search, role, and active status filters.
 */
router.get('/users', requireRole(['admin']), asyncHandler(userController.list));

/**
 * PATCH /api/admin/users/:id/role
 * Role: admin
 * Update a user's role. Body: { role: 'admin' | 'librarian' | 'member' }
 */
router.patch(
  '/users/:id/role',
  requireRole(['admin']),
  validate(updateUserRoleSchema),
  asyncHandler(userController.updateRole),
);

/**
 * PATCH /api/admin/users/:id/status
 * Role: admin
 * Toggle a user's active status. Body: { isActive: boolean }
 */
router.patch(
  '/users/:id/status',
  requireRole(['admin']),
  validate(updateUserStatusSchema),
  asyncHandler(userController.toggleActive),
);

// ── Seed (admin only) ───────────────────────────────────────────────────────

/**
 * POST /api/admin/seed-books
 * Role: admin
 * Seed the database with sample books + HTML files. Idempotent — skips existing ISBNs.
 */
router.post('/seed-books', requireRole(['admin']), asyncHandler(seedController.seedBooks));

export default router;
