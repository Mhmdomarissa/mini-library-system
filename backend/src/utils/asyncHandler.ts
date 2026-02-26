import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * asyncHandler — wraps an async Express route handler so any rejected promise
 * is automatically forwarded to next(err) instead of causing an unhandled
 * rejection or requiring try/catch in every controller.
 *
 * Usage:
 *   router.get('/books', asyncHandler(bookController.list));
 *   router.post('/books', authenticate, requireRole(['admin']), asyncHandler(bookController.create));
 *
 * Controllers can now throw AppError or let Mongoose errors bubble without
 * any try/catch boilerplate — the global error handler in app.ts takes over.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
