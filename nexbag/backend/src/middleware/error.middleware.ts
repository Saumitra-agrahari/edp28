import { Request, Response, NextFunction } from 'express';
import { AppError, errorResponse } from '../utils/response.utils';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// ─── Global error handler middleware ──────────────────────────────────────────
// Per AI_Instructions.md §5: catches all thrown errors, formats them
// Never try/catch in controllers — let errors propagate here

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log all errors (with stack in dev, without in production per Security.md §15)
  if (err instanceof AppError) {
    logger.warn(`AppError [${err.code}]: ${err.message}`, {
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    });

    errorResponse(res, err.statusCode, err.code, err.message, err.fields, err.extra);
    return;
  }

  // Unknown errors — log as error, return generic 500
  logger.error('Unhandled error', {
    err,
    path: req.path,
    method: req.method,
    stack: env.NODE_ENV === 'development' && err instanceof Error ? err.stack : undefined,
  });

  errorResponse(
    res,
    500,
    'INTERNAL_ERROR',
    'An unexpected error occurred. Please try again later.'
  );
}
