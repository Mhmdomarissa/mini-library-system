import type { Application, Request, Response, NextFunction } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AppError } from './utils/AppError';
import { sendError } from './utils/response';
import logger from './utils/logger';
import bookRoutes from './routes/book.routes';
import borrowRoutes from './routes/borrow.routes';
import adminRoutes from './routes/admin.routes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

// API Routes
app.use('/api/books', bookRoutes);
app.use('/api/borrow', borrowRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler — must be registered AFTER all routes
app.use((_req: Request, res: Response) => {
  sendError(res, 'Route not found', 404);
});

// Global error handler — must be LAST middleware (4-arg signature required)
// Uses `unknown` because Express 5 can throw non-Error values
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // Operational errors (AppError): safe to expose message to client
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error(err.message, { stack: err.stack });
    } else {
      logger.warn(err.message, { status: err.status });
    }
    sendError(res, err.isOperational ? err.message : 'Internal server error', err.status);
    return;
  }

  // Mongoose duplicate key error (code 11000)
  if (typeof err === 'object' && err !== null && (err as Record<string, unknown>).code === 11000) {
    logger.warn('Duplicate key error', { err });
    sendError(res, 'A record with that value already exists', 409);
    return;
  }

  // Unexpected errors: log fully, hide detail from client
  if (err instanceof Error) {
    logger.error(err.message, { stack: err.stack });
  } else {
    logger.error('Unknown error thrown', { err });
  }

  sendError(res, 'Internal server error', 500);
});

export default app;
