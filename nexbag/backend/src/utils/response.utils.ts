import type { Response } from 'express';

// ─── Standard success response ────────────────────────────────────────────────
// Matches API.md §2 response envelope format exactly

export interface PaginationMeta {
  page?: number;
  per_page?: number;
  total?: number;
  next_cursor?: string | null;
  count?: number;
  unread_count?: number;
}

export function successResponse(
  res: Response,
  data: unknown,
  message = 'Operation completed successfully',
  statusCode = 200,
  meta?: PaginationMeta
): Response {
  const body: Record<string, unknown> = {
    success: true,
    data,
    message,
  };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

// ─── Standard error response ──────────────────────────────────────────────────

export interface ErrorResponseBody {
  code: string;
  message: string;
  fields?: Record<string, string>;
  locked_until?: string;
}

export function errorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
  extra?: Record<string, unknown>
): Response {
  const body: Record<string, unknown> = {
    success: false,
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
      ...(extra ?? {}),
    },
  };
  return res.status(statusCode).json(body);
}

// ─── AppError — typed error class for service layer ───────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly fields?: Record<string, string>;
  public readonly extra?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
    extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    this.extra = extra;

    // Maintains proper stack trace (Node.js only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// ─── asyncHandler — wraps async route handlers to forward errors ───────────────
// Per AI_Instructions.md §4

import type { Request, NextFunction, RequestHandler } from 'express';

export const asyncHandler =
  (fn: RequestHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
