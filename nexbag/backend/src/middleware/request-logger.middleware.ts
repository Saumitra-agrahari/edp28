import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// ─── HTTP request logger ───────────────────────────────────────────────────────
// Logs: method, path, status, duration per AI_Instructions.md §9
// Does NOT log request body (may contain passwords) per Security.md §15

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const userId = req.user?.id;

    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      ...(userId ? { userId } : {}),
    });
  });

  next();
}
