import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { sendError } from '../utils/response';

/**
 * Custom handler so rate-limit rejections use the same JSON envelope
 * as all other errors in this API (success: false, message: ...).
 */
const rateLimitHandler = (_req: Request, res: Response): void => {
  sendError(res, 'Too many requests — please try again later', 429);
};

/**
 * generalLimiter — applied to all /api/* routes.
 * 200 requests per IP per 15 minutes is generous for normal use
 * but stops naive scrapers and runaway clients.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true, // Return RateLimit-* headers (RFC 6585)
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * strictLimiter — applied to write operations that affect availability:
 *   POST /api/borrow/:bookId
 *   POST /api/borrow/return/:borrowId
 *
 * 30 per IP per 15 minutes is still far above legitimate use
 * while shutting down borrow-spam attacks.
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * adminLimiter — applied to /api/admin/* routes.
 * Admin operations are low-frequency by design; a tighter limit
 * reduces the blast radius of a compromised admin token.
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
