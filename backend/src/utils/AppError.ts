/**
 * AppError — operational errors that should produce HTTP responses.
 *
 * Usage:
 *   throw new AppError('Book not found', 404);
 *   throw new AppError('ISBN already exists', 409);
 *
 * The global error handler in app.ts checks `err.isOperational`:
 *   - true  → safe to expose message to client
 *   - false → generic "Internal server error" shown, real message logged only
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly isOperational: boolean;

  constructor(message: string, status: number, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.isOperational = isOperational;

    // Restore prototype chain (required when extending built-ins in TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string): AppError {
    return new AppError(message, 400);
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(message, 403);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(message, 404);
  }

  static conflict(message: string): AppError {
    return new AppError(message, 409);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(message, 500, false);
  }
}
