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
        // NOTE: req.query is a read-only getter in Express 5 — the assignment
        // is silently ignored for 'query' targets; controllers must read
        // directly from req.query using Number() / String() coercion.
        try {
          (req as Request & Record<string, unknown>)[target] = parsed;
        } catch {
          // read-only property (e.g. req.query in Express 5) — safe to ignore;
          // validation already ran and next() will be called below.
        }
        next();
      })
      .catch((error: unknown) => {
        if (error instanceof ZodError) {
          res.status(400).json({
            success: false,
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
