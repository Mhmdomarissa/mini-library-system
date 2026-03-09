import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * requestLogger — logs every inbound HTTP request and its outcome.
 *
 * Fields logged:
 *   method        — GET, POST, PATCH …
 *   path          — URL pathname only (no query string in log line)
 *   statusCode    — final HTTP response status
 *   responseTimeMs — wall-clock ms from request start to response finish
 *   userId        — Firebase UID if the request was authenticated, else 'anonymous'
 *   ip            — client IP (respects X-Forwarded-For if set)
 *
 * Level strategy:
 *   5xx  → error   (something is broken)
 *   4xx  → warn    (client did something wrong; not our fault, but worth watching)
 *   2xx/3xx → info (normal traffic; debug level in development keeps console clean)
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - startAt;
    const responseTimeMs = Number(durationNs / 1_000_000n);

    const userId = req.user?.firebaseUid ?? 'anonymous';
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? '-';
    const method = req.method;
    // Use originalUrl so mounted-router paths appear in full (e.g. /api/books
    // instead of just /) — req.path is relative to the router mount point.
    const urlPath = req.originalUrl?.split('?')[0] ?? req.path;
    const { statusCode } = res;

    const meta = {
      method,
      path: urlPath,
      statusCode,
      responseTimeMs,
      userId,
      ip,
    };

    const message = `${method} ${urlPath} ${statusCode} ${responseTimeMs}ms`;

    if (statusCode >= 500) {
      logger.error(message, meta);
    } else if (statusCode >= 400) {
      logger.warn(message, meta);
    } else {
      logger.info(message, meta);
    }
  });

  next();
};
