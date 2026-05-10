import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/bcrypt.utils';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../utils/jwt.utils';
import { generateOtp, storeOtp, generateResetToken } from '../utils/otp.utils';
import { AppError } from '../utils/response.utils';
import { activityLogService } from './activity-log.service';
import { emailService } from './email.service';
import type { RegisterInput } from '../validators/auth.validator';

// Constants per Security.md and Features.md
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const DEFAULT_NOTIFICATION_TYPES = [
  'ITEM_MISSING',
  'GEOFENCE_BREACH',
  'UNAUTHORIZED_ACCESS',
  'LOCK_STATE_CHANGE',
  'DEVICE_OFFLINE',
  'DEVICE_ONLINE',
] as const;

// ─── Token builder helper ──────────────────────────────────────────────────────
function buildTokens(userId: string, email: string, deviceId: string | null, rememberMe = false) {
  const rawRefreshToken = generateRefreshToken();
  const hashedRefreshToken = hashRefreshToken(rawRefreshToken);

  const accessToken = signAccessToken({ sub: userId, email, device_id: deviceId });

  const refreshTtlDays = rememberMe ? 30 : 7;
  const refreshExpiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);

  return { accessToken, rawRefreshToken, hashedRefreshToken, refreshExpiresAt, refreshTtlDays };
}

// ─── AuthService ──────────────────────────────────────────────────────────────
export const authService = {
  // ── Register ────────────────────────────────────────────────────────────────
  async register(input: RegisterInput, ipAddress?: string) {
    // Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new AppError(409, 'CONFLICT', 'An account with this email already exists.');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        fullName: input.full_name,
        email: input.email,
        passwordHash,
      },
    });

    // Seed default notification preferences (Database.md §7)
    await prisma.notificationPreference.createMany({
      data: DEFAULT_NOTIFICATION_TYPES.map((type) => ({
        userId: user.id,
        notificationType: type,
        isEnabled: type !== 'DEVICE_ONLINE', // DEVICE_ONLINE disabled by default
      })),
    });

    // Issue tokens
    const { accessToken, rawRefreshToken, hashedRefreshToken, refreshExpiresAt } =
      buildTokens(user.id, user.email, null);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken: hashedRefreshToken,
        ipAddress: ipAddress ?? null,
        expiresAt: refreshExpiresAt,
      },
    });

    await activityLogService.log({
      userId: user.id,
      eventType: 'USER_LOGIN',
      description: `Account created for ${user.email}`,
    });

    return {
      user: {
        id: user.id,
        full_name: user.fullName,
        email: user.email,
        has_device: false,
        created_at: user.createdAt,
      },
      tokens: {
        access_token: accessToken,
        refresh_token: rawRefreshToken,
        access_token_expires_in: 900, // 15 minutes in seconds
        refresh_token_expires_in: 7 * 24 * 60 * 60,
      },
    };
  },

  // ── Login ────────────────────────────────────────────────────────────────────
  async login(
    email: string,
    password: string,
    rememberMe: boolean,
    ipAddress?: string,
    deviceInfo?: string
  ) {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      // No user enumeration — generic error
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password.');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new AppError(
        423,
        'ACCOUNT_LOCKED',
        `Account temporarily locked. Try again in ${minutesLeft} minutes.`,
        undefined,
        { locked_until: user.lockedUntil.toISOString() }
      );
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);

    if (!passwordMatch) {
      // Increment failed attempts
      const newAttempts = user.failedLoginAttempts + 1;
      const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60_000)
        : null;

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: newAttempts, lockedUntil },
      });

      if (shouldLock) {
        throw new AppError(
          423,
          'ACCOUNT_LOCKED',
          `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Try again in ${LOCKOUT_DURATION_MINUTES} minutes.`,
          undefined,
          { locked_until: lockedUntil?.toISOString() }
        );
      }

      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password.');
    }

    // Reset failed attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const { accessToken, rawRefreshToken, hashedRefreshToken, refreshExpiresAt, refreshTtlDays } =
      buildTokens(user.id, user.email, user.deviceId, rememberMe);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken: hashedRefreshToken,
        ipAddress: ipAddress ?? null,
        deviceInfo: deviceInfo ?? null,
        expiresAt: refreshExpiresAt,
      },
    });

    await activityLogService.log({
      userId: user.id,
      deviceId: user.deviceId ?? undefined,
      eventType: 'USER_LOGIN',
      description: 'User logged in',
    });

    return {
      user: {
        id: user.id,
        full_name: user.fullName,
        email: user.email,
        has_device: !!user.deviceId,
        device_id: user.deviceId,
      },
      tokens: {
        access_token: accessToken,
        refresh_token: rawRefreshToken,
        access_token_expires_in: 900,
        refresh_token_expires_in: refreshTtlDays * 24 * 60 * 60,
      },
    };
  },

  // ── Refresh token ─────────────────────────────────────────────────────────────
  async refresh(rawRefreshToken: string) {
    const hashed = hashRefreshToken(rawRefreshToken);

    const session = await prisma.userSession.findUnique({
      where: { refreshToken: hashed },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new AppError(401, 'UNAUTHORIZED', 'Refresh token is invalid or expired.');
    }

    // Detect token reuse (replay attack) — per Security.md §2
    // If token is revoked but someone is using it, invalidate all sessions
    if (session.revokedAt) {
      await prisma.userSession.updateMany({
        where: { userId: session.userId },
        data: { revokedAt: new Date() },
      });
      throw new AppError(401, 'UNAUTHORIZED', 'Token reuse detected. All sessions invalidated.');
    }

    // Rotate refresh token — revoke old, issue new
    const { accessToken, rawRefreshToken: newRawToken, hashedRefreshToken, refreshExpiresAt } =
      buildTokens(session.user.id, session.user.email, session.user.deviceId);

    await prisma.$transaction([
      prisma.userSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      prisma.userSession.create({
        data: {
          userId: session.userId,
          refreshToken: hashedRefreshToken,
          ipAddress: session.ipAddress,
          deviceInfo: session.deviceInfo,
          expiresAt: refreshExpiresAt,
        },
      }),
    ]);

    return {
      tokens: {
        access_token: accessToken,
        refresh_token: newRawToken,
        access_token_expires_in: 900,
      },
    };
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  async logout(userId: string, rawRefreshToken: string) {
    const hashed = hashRefreshToken(rawRefreshToken);

    await prisma.userSession.updateMany({
      where: { userId, refreshToken: hashed, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await activityLogService.log({
      userId,
      eventType: 'USER_LOGOUT',
      description: 'User logged out',
    });
  },

  // ── Forgot password ────────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    // Always return success to prevent user enumeration per Security.md §17
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (user) {
      const otp = generateOtp();
      await storeOtp(user.id, otp);
      await emailService.sendOtpEmail(user.email, user.fullName, otp);
    }

    return { message: 'If this email exists, a reset OTP has been sent.' };
  },

  // ── Verify OTP and issue reset token ──────────────────────────────────────
  async verifyOtpForReset(email: string, otp: string) {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user) {
      throw new AppError(400, 'INVALID_OTP', 'OTP is invalid or has expired.');
    }

    // verifyOtp throws if invalid/expired
    const { verifyOtp } = await import('../utils/otp.utils');
    await verifyOtp(user.id, otp);

    // Issue a short-lived reset token (store hashed)
    const rawResetToken = generateResetToken();
    const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken: hashedResetToken,
        deviceInfo: 'reset',
        expiresAt,
      },
    });

    return { reset_token: rawResetToken };
  },

  // ── Reset password ────────────────────────────────────────────────────────
  async resetPassword(rawResetToken: string, newPassword: string) {
    const hashedToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');

    const session = await prisma.userSession.findFirst({
      where: {
        refreshToken: hashedToken,
        deviceInfo: 'reset',
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new AppError(400, 'INVALID_TOKEN', 'Reset token is invalid or has expired.');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      // Update password
      prisma.user.update({
        where: { id: session.userId },
        data: { passwordHash },
      }),
      // Revoke the reset token
      prisma.userSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      // Invalidate ALL active sessions (security: step-down all devices)
      prisma.userSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await activityLogService.log({
      userId: session.userId,
      eventType: 'PASSWORD_RESET',
      description: 'Password reset via OTP',
    });
  },
};
