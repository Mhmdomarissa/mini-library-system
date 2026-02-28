import { Router, type Request, type Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile (including role).
 * Used by the frontend AuthContext to resolve the user's role after sign-in.
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, req.user);
  }),
);

export default router;
