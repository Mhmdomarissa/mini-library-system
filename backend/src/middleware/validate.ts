import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodIssue } from 'zod';
import { ZodError } from 'zod';

type ValidateTarget = 'body' | 'query' | 'params';

/**
 * Validate request data against a Zod schema.
 * @param schema  - Zod schema to validate against
 * @param target  - Which part of the request to validate (default: 'body')
 *
 * Controllers downstream can assume the validated target is clean and typed.
 * No unvalidated input ever reaches a controller.
 */
export const validate = (schema: ZodSchema, target: ValidateTarget = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Guard against completely missing body (e.g. missing Content-Type header)
    const data = req[target] ?? {};

    // Use parseAsync so schemas with async refinements (e.g. DB uniqueness
    // checks added in future) work without changing the middleware.
    schema
      .parseAsync(data)
      .then((parsed) => {
        // Replace with the Zod-coerced/stripped version so controllers get
        // clean, type-safe data and no extra fields leak through.
        (req as Request & Record<string, unknown>)[target] = parsed;
        next();
      })
      .catch((error: unknown) => {
        if (error instanceof ZodError) {
          res.status(400).json({
            message: 'Validation error',
            errors: error.issues.map((e: ZodIssue) => ({
              field: e.path.join('.') || target,
              message: e.message,
            })),
          });
          return;
        }
        // Unexpected schema error — propagate to global error handler
        next(error);
      });
  };
};
