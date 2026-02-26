import type { Response } from 'express';

/**
 * Standard response envelope used by every endpoint.
 *
 * Success shape:   { success: true,  data: T }
 * Error shape:     { success: false, message: string, errors?: FieldError[] }
 *
 * Controllers must ONLY use these helpers — never call res.json() directly.
 * This ensures every response across the API has the same predictable shape.
 */

export interface FieldError {
  field: string;
  message: string;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: FieldError[];
}

/**
 * Send a successful response.
 *
 * @param res    - Express response object
 * @param data   - Payload to send (null for 204-style deletes)
 * @param status - HTTP status code (default: 200)
 */
export const sendSuccess = <T>(res: Response, data: T, status = 200): void => {
  const body: SuccessResponse<T> = { success: true, data };
  res.status(status).json(body);
};

/**
 * Send a created (201) response.
 */
export const sendCreated = <T>(res: Response, data: T): void => {
  sendSuccess(res, data, 201);
};

/**
 * Send an error response.
 * Prefer throwing AppError inside controllers — the global error handler
 * calls this automatically. Use directly only in middleware that can't throw.
 */
export const sendError = (
  res: Response,
  message: string,
  status = 500,
  errors?: FieldError[],
): void => {
  const body: ErrorResponse = { success: false, message, ...(errors && { errors }) };
  res.status(status).json(body);
};
