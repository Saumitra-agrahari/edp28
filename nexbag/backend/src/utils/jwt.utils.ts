import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { AppError } from './response.utils';

// ─── JWT payload type ─────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string;      // userId
  email: string;
  device_id: string | null;
  iat?: number;
  exp?: number;
}

// ─── Sign access token (15m TTL) ─────────────────────────────────────────────
export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  } as jwt.SignOptions);
}

// ─── Verify access token ──────────────────────────────────────────────────────
export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired access token.');
  }
}

// ─── Generate raw refresh token (64 random bytes → hex) ───────────────────────
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

// ─── Hash refresh token with SHA-256 for DB storage ──────────────────────────
// Per Security.md §2: raw token sent to client, only hash stored in DB
export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
