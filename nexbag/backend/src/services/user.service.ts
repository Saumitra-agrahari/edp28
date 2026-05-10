import { prisma } from '../config/prisma';
import { AppError } from '../utils/response.utils';
import { comparePassword, hashPassword } from '../utils/bcrypt.utils';

export const userService = {
  // ── GET /v1/users/me ─────────────────────────────────────────────────────
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        deviceId: true,
        quietHoursEnabled: true,
        quietHoursStart: true,
        quietHoursEnd: true,
        createdAt: true,
      },
    });

    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found.');

    return {
      id: user.id,
      full_name: user.fullName,
      email: user.email,
      has_device: !!user.deviceId,
      device_id: user.deviceId,
      quiet_hours_enabled: user.quietHoursEnabled,
      quiet_hours_start: user.quietHoursStart,
      quiet_hours_end: user.quietHoursEnd,
      created_at: user.createdAt,
    };
  },

  // ── PATCH /v1/users/me ────────────────────────────────────────────────────
  async updateProfile(userId: string, fullName?: string) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { ...(fullName ? { fullName } : {}) },
      select: { id: true, fullName: true, email: true, deviceId: true },
    });

    return {
      id: updated.id,
      full_name: updated.fullName,
      email: updated.email,
      has_device: !!updated.deviceId,
    };
  },

  // ── POST /v1/users/me/password ────────────────────────────────────────────
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found.');

    const match = await comparePassword(currentPassword, user.passwordHash);
    if (!match) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Current password is incorrect.', {
        current_password: 'Current password is incorrect.',
      });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

    // Invalidate all sessions except current (force re-login on other devices)
    await prisma.userSession.updateMany({
      where: { userId, revokedAt: null, deviceInfo: { not: 'otp' } },
      data: { revokedAt: new Date() },
    });
  },

  // ── POST /v1/users/me/fcm-token ───────────────────────────────────────────
  async registerFcmToken(userId: string, fcmToken: string, platform: 'android' | 'ios') {
    // Upsert: insert or update timestamp on conflict
    await prisma.userDeviceToken.upsert({
      where: { userId_fcmToken: { userId, fcmToken } },
      update: { updatedAt: new Date() },
      create: { userId, fcmToken, platform },
    });
  },

  // ── DELETE /v1/users/me/fcm-token ────────────────────────────────────────
  async removeFcmToken(userId: string, fcmToken: string) {
    await prisma.userDeviceToken.deleteMany({ where: { userId, fcmToken } });
  },
};
