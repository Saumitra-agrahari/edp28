import rateLimit from 'express-rate-limit';
import { errorResponse } from '../utils/response.utils';
import { Request, Response } from 'express';

const rateLimitHandler = (_req: Request, res: Response): void => {
  errorResponse(
    res,
    429,
    'RATE_LIMITED',
    'Too many requests. Please try again later.'
  );
};

// ─── Auth rate limiters (per Security.md §10) ─────────────────────────────────

// POST /auth/login — 10 requests per 15 minutes per IP
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /auth/register — 5 requests per hour per IP
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /auth/password/forgot — 5 requests per hour per IP
export const forgotPasswordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /auth/password/verify-otp — 10 requests per 15 minutes per IP
export const verifyOtpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /lock/command — 30 requests per minute per user
export const lockCommandRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'unknown',
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// General API — 100 requests per minute per user/IP
export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? 'unknown',
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});
