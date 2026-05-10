import { prisma } from '../config/prisma';
import { AppError } from '../utils/response.utils';
import { activityLogService } from './activity-log.service';

export const deviceService = {
  // ── POST /v1/devices/pair ─────────────────────────────────────────────────
  async pairDevice(userId: string, deviceCode: string) {
    // Normalize device code to uppercase
    const normalizedCode = deviceCode.toUpperCase().trim();

    const device = await prisma.device.findUnique({
      where: { deviceCode: normalizedCode },
    });

    if (!device) {
      throw new AppError(404, 'NOT_FOUND', 'Device not found.');
    }

    if (device.ownerUserId && device.ownerUserId !== userId) {
      throw new AppError(409, 'CONFLICT', 'This device is already linked to another account.');
    }

    // Check if user already has a device — unpair old device first
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (currentUser?.deviceId && currentUser.deviceId !== device.id) {
      // Unpair the old device
      await prisma.device.update({
        where: { id: currentUser.deviceId },
        data: { ownerUserId: null },
      });
    }

    // Link device to user (both sides of the relationship)
    const [updatedDevice] = await prisma.$transaction([
      prisma.device.update({
        where: { id: device.id },
        data: { ownerUserId: userId },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { deviceId: device.id },
      }),
    ]);

    await activityLogService.log({
      userId,
      deviceId: device.id,
      eventType: 'DEVICE_PAIRED',
      description: `Device paired: ${normalizedCode}`,
    });

    return {
      id: updatedDevice.id,
      device_code: updatedDevice.deviceCode,
      device_name: updatedDevice.deviceName,
      is_online: updatedDevice.isOnline,
      lock_state: updatedDevice.lockState,
      firmware_version: updatedDevice.firmwareVersion,
    };
  },

  // ── GET /v1/devices/me ───────────────────────────────────────────────────
  async getDevice(deviceId: string) {
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) throw new AppError(404, 'NOT_FOUND', 'Device not found.');

    return {
      id: device.id,
      device_code: device.deviceCode,
      device_name: device.deviceName,
      is_online: device.isOnline,
      last_heartbeat_at: device.lastHeartbeatAt,
      firmware_version: device.firmwareVersion,
      lock_state: device.lockState,
      last_known_lat: device.lastKnownLat,
      last_known_lng: device.lastKnownLng,
      last_location_at: device.lastLocationAt,
    };
  },

  // ── PATCH /v1/devices/me ─────────────────────────────────────────────────
  async updateDevice(deviceId: string, deviceName: string) {
    const updated = await prisma.device.update({
      where: { id: deviceId },
      data: { deviceName },
    });
    return { device_name: updated.deviceName };
  },

  // ── DELETE /v1/devices/me/unpair ─────────────────────────────────────────
  async unpairDevice(userId: string, deviceId: string) {
    await prisma.$transaction([
      prisma.device.update({
        where: { id: deviceId },
        data: { ownerUserId: null },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { deviceId: null },
      }),
    ]);

    await activityLogService.log({
      userId,
      deviceId,
      eventType: 'DEVICE_UNPAIRED',
      description: 'Device unpaired by user',
    });
  },
};
