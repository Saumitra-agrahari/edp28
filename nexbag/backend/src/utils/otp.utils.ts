import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { AppError } from './response.utils';

const OTP_TTL_MINUTES = 15;

// ─── Generate a 6-digit OTP ───────────────────────────────────────────────────
export function generateOtp(): string {
  // Cryptographically random 6-digit number (000000–999999)
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(6, '0');
}

// ─── Hash OTP for storage ─────────────────────────────────────────────────────
function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

// ─── Store OTP — we repurpose user_sessions table with a special token type ───
// We store hashed OTP as the refresh_token field with device_info = 'otp'
// This avoids an extra table for v1 (per Anti-Over-Engineering rules)
export async function storeOtp(userId: string, otp: string): Promise<void> {
  const hashedOtp = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  // Revoke any existing OTP sessions for this user
  await prisma.userSession.updateMany({
    where: { userId, deviceInfo: 'otp', revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await prisma.userSession.create({
    data: {
      userId,
      refreshToken: hashedOtp,
      deviceInfo: 'otp',
      expiresAt,
    },
  });
}

// ─── Verify OTP ────────────────────────────────────────────────────────────────
export async function verifyOtp(userId: string, otp: string): Promise<void> {
  const hashedOtp = hashOtp(otp);

  const otpSession = await prisma.userSession.findFirst({
    where: {
      userId,
      refreshToken: hashedOtp,
      deviceInfo: 'otp',
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!otpSession) {
    throw new AppError(400, 'INVALID_OTP', 'OTP is invalid or has expired.');
  }

  // Revoke OTP after use (one-time)
  await prisma.userSession.update({
    where: { id: otpSession.id },
    data: { revokedAt: new Date() },
  });
}

// ─── Generate a short-lived reset token (separate from OTP) ──────────────────
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
