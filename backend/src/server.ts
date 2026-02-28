import 'dotenv/config';
import type { Server } from 'http';
import mongoose from 'mongoose';
import app from './app';
import connectDB from './config/database';
import logger from './utils/logger';

const PORT = process.env.PORT || 3000;

// ── Graceful shutdown ─────────────────────────────────────────────────────────
// Called on SIGTERM (Docker stop / k8s pod eviction) and SIGINT (Ctrl-C).
//
// Sequence:
//   1. server.close() — stop accepting new connections; in-flight requests finish.
//   2. mongoose.connection.close(false) — drain the Mongo connection pool cleanly
//      without force-killing open sockets.  Passing false means we wait for any
//      in-progress operations (including open transactions) to complete rather
//      than hard-aborting them.
//   3. process.exit(0) — clean exit so the container manager sees success.
//
// A 10-second hard-kill timer ensures we never block a rolling deploy forever if
// a request is genuinely stuck.
const shutdown = (server: Server, signal: string): void => {
  logger.info(`${signal} received — shutting down gracefully`);

  server.close(async () => {
    logger.info('HTTP server closed — draining Mongo connection pool');
    try {
      await mongoose.connection.close(false);
      logger.info('Mongo connection closed');
    } catch (err) {
      logger.error('Error closing Mongo connection', { err });
    }
    process.exit(0);
  });

  // Force-kill if server hasn't closed within 10 s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
};

// ── Startup ───────────────────────────────────────────────────────
const start = async (): Promise<void> => {
  // DB must be connected BEFORE the server accepts traffic
  await connectDB();

  const server: Server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });

  // Graceful shutdown on container stop / Ctrl-C
  process.on('SIGTERM', () => shutdown(server, 'SIGTERM'));
  process.on('SIGINT', () => shutdown(server, 'SIGINT'));
};

// ── Global safety nets ────────────────────────────────────────────

// Helper: safely extract message + stack from any thrown value.
// Error.message and Error.stack are non-enumerable — passing { err } to Winston
// serialises as {} because JSON.stringify skips non-enumerable props.
const serializeError = (e: unknown): { message: string; stack?: string } => ({
  message: e instanceof Error ? e.message : String(e),
  stack: e instanceof Error ? e.stack : undefined,
});

// Catch any unhandled promise rejection (e.g. DB query outside try/catch)
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', serializeError(reason));
  // Let the process exit so a process manager (PM2 / k8s) can restart it
  process.exit(1);
});

// Catch thrown exceptions that were not caught anywhere
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

start().catch((err: unknown) => {
  logger.error('Failed to start server', serializeError(err));
  process.exit(1);
});
