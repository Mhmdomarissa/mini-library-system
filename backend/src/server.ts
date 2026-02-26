import 'dotenv/config';
import type { Server } from 'http';
import app from './app';
import connectDB from './config/database';
import logger from './utils/logger';

const PORT = process.env.PORT || 3000;

// ── Graceful shutdown ────────────────────────────────────────────
const shutdown = (server: Server, signal: string): void => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
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

// Catch any unhandled promise rejection (e.g. DB query outside try/catch)
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', { reason });
  // Let the process exit so a process manager (PM2 / k8s) can restart it
  process.exit(1);
});

// Catch thrown exceptions that were not caught anywhere
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

start().catch((err: unknown) => {
  logger.error('Failed to start server', { err });
  process.exit(1);
});
