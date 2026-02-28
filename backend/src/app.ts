import type { Application, Request, Response, NextFunction } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import os from 'os';
import { AppError } from './utils/AppError';
import { sendError, sendSuccess } from './utils/response';
import logger from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import { generalLimiter, strictLimiter, adminLimiter, chatLimiter } from './middleware/rateLimiter';
import bookRoutes from './routes/book.routes';
import borrowRoutes from './routes/borrow.routes';
import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';

const app: Application = express();

// ── Trust proxy ───────────────────────────────────────────────────────────
// Railway (and most PaaS) sit behind a load balancer that sets X-Forwarded-For.
// Without this, express-rate-limit cannot identify real client IPs and throws
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR. '1' means trust the first hop only.
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────────────────
// helmet() sets: X-DNS-Prefetch-Control, X-Frame-Options (DENY), HSTS,
// X-Download-Options, X-Content-Type-Options (nosniff), X-XSS-Protection
app.use(
  helmet({
    // Strict-Transport-Security: 1 year, include subdomains, allow preload
    hsts: {
      maxAge: 31_536_000,
      includeSubDomains: true,
      preload: true,
    },
    // Content-Security-Policy: API-only server — no scripts/frames needed
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'none'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    // Remove X-Powered-By: Express fingerprint
    hidePoweredBy: true,
    // Prevent MIME-type sniffing
    noSniff: true,
    // Deny framing by any origin
    frameguard: { action: 'deny' },
    // Disable XSS filter (modern browsers ignore it; strict CSP is better)
    xssFilter: false,
  }),
);

// ── CORS ─────────────────────────────────────────────────────────────────
// ALLOWED_ORIGINS is a comma-separated list of permitted front-end origins.
// Example: ALLOWED_ORIGINS=https://myapp.com,https://staging.myapp.com
// If unset (local dev), all origins are allowed so tooling (Postman, etc.) works.
// In production this MUST be set — a missing value logs an error and falls back
// to deny-all rather than silently opening the API to the world.
const rawOrigins = process.env.ALLOWED_ORIGINS;
let corsOrigin: string | string[] | boolean;

if (!rawOrigins) {
  if (process.env.NODE_ENV === 'production') {
    logger.error('ALLOWED_ORIGINS is not set in production — CORS will deny all origins');
    corsOrigin = false; // deny all origins in production if env var is missing
  } else {
    corsOrigin = true; // allow all in local dev
  }
} else {
  corsOrigin = rawOrigins.split(',').map((o) => o.trim());
}

app.use(
  cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
  }),
);
app.use(express.json({ limit: '10kb' })); // reject oversized bodies early
app.use(express.urlencoded({ extended: true }));

// ── Request logging ───────────────────────────────────────────────────────
// Registered before routes so every request gets a log entry.
// Logs: method, path, statusCode, responseTimeMs, userId, ip
app.use(requestLogger);

// ── Health check ──────────────────────────────────────────────────────────
// No auth, no rate-limit — load balancers ping this frequently.
// Reports: DB connection state, process uptime, heap memory.
app.get('/health', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  // Mongoose readyState: 0=disconnected 1=connected 2=connecting 3=disconnecting
  const dbStatus =
    ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] ?? 'unknown';
  const healthy = dbState === 1;

  const uptimeSeconds = Math.floor(process.uptime());
  const mem = process.memoryUsage();

  const data = {
    status: healthy ? 'ok' : 'degraded',
    db: dbStatus,
    uptime: `${uptimeSeconds}s`,
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1_048_576),
      heapTotalMB: Math.round(mem.heapTotal / 1_048_576),
      rssMB: Math.round(mem.rss / 1_048_576),
    },
    hostname: os.hostname(),
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  };

  sendSuccess(res, data, healthy ? 200 : 503);
});

// ── API Routes (with per-group rate limiting) ─────────────────────────────
app.use('/api/auth', generalLimiter, authRoutes);
app.use('/api/books', generalLimiter, bookRoutes);
app.use('/api/borrow', strictLimiter, borrowRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);

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
