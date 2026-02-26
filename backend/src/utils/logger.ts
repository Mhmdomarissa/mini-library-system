import { createLogger, format, transports } from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

// Log levels used across the codebase:
//   error  — unhandled exceptions, DB failures, crash-level events
//   warn   — auth failures, access denied, recoverable issues
//   info   — server start, DB connect, user creation (no PII in message)
//   debug  — request detail, query params (disabled in production)
const logger = createLogger({
  level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),

  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    // Redact sensitive fields before any transport sees them
    format((info) => {
      const sensitive = ['token', 'password', 'authorization', 'secret', 'privateKey'];
      sensitive.forEach((key) => {
        if (key in info) {
          (info as Record<string, unknown>)[key] = '[REDACTED]';
        }
      });
      return info;
    })(),
    isProduction
      ? format.json() // structured JSON for log aggregators (Datadog, CloudWatch)
      : format.combine(format.colorize(), format.simple()), // human-readable in dev
  ),

  transports: [
    new transports.Console(),
    // In production, also write errors to a persistent file so they survive
    // container restarts before the log shipper picks them up.
    ...(isProduction ? [new transports.File({ filename: 'logs/error.log', level: 'error' })] : []),
  ],
});

export default logger;
