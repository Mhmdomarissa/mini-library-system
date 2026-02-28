import type { Request, Response } from 'express';
import type { Types } from 'mongoose';
import { userService } from '../services/user.service';
import { sendSuccess } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import type { UserRole } from '../models/User';

/**
 * GET /api/admin/users
 * Role: admin
 *
 * List all users with optional filtering by search, role, active status.
 */
export const list = async (req: Request, res: Response): Promise<void> => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const role = typeof req.query.role === 'string' ? (req.query.role as UserRole) : undefined;
  const isActive =
    req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

  const pagination = parsePagination(req);
  const result = await userService.list({ search, role, isActive }, pagination);

  sendSuccess(res, result);
};

/**
 * PATCH /api/admin/users/:id/role
 * Role: admin
 *
 * Update a user's role. Body: { role: 'admin' | 'librarian' | 'member' }
 */
export const updateRole = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { role } = req.body as { role: UserRole };
  const requesterId = (req.user!._id as Types.ObjectId).toString();

  const user = await userService.updateRole(id, role, requesterId);

  sendSuccess(res, { user });
};

/**
 * PATCH /api/admin/users/:id/status
 * Role: admin
 *
 * Toggle a user's active status. Body: { isActive: boolean }
 */
export const toggleActive = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { isActive } = req.body as { isActive: boolean };
  const requesterId = (req.user!._id as Types.ObjectId).toString();

  const user = await userService.toggleActive(id, isActive, requesterId);

  sendSuccess(res, { user });
};
