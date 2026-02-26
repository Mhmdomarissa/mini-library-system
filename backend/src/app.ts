import type { Application, Request, Response, NextFunction } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import logger from './utils/logger';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Routes will be registered here

// 404 handler — must be registered AFTER all routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler — must be LAST middleware (4-arg signature required)
// Uses `unknown` because Express 5 can throw non-Error values
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Error) {
    logger.error(err.message, { stack: err.stack });
    // Propagate status code set by upstream (e.g. createError)
    const status = (err as Error & { status?: number }).status ?? 500;
    res.status(status).json({
      message: status < 500 ? err.message : 'Internal server error',
    });
  } else {
    logger.error('Unknown error thrown', { err });
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default app;
