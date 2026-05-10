import { prisma } from '../config/prisma';
import { AppError } from '../utils/response.utils';
import { websocketService } from './websocket.service';
import { notificationService } from './notification.service';
import { activityLogService } from './activity-log.service';
import { mqttClient } from '../mqtt/mqtt.client';
import { TOPICS } from '../mqtt/topics';
import type { MqttLockStatusPayload } from '../types/mqtt.types';

// Lock command timeout per Features.md LOCK-01
const COMMAND_TIMEOUT_SECONDS = 10;

export const lockService = {
  // ── GET /v1/lock/status ───────────────────────────────────────────────────
  async getLockStatus(deviceId: string) {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { lockState: true, isOnline: true, updatedAt: true },
    });

    if (!device) throw new AppError(404, 'NOT_FOUND', 'Device not found.');

    const lastEvent = await prisma.lockEvent.findFirst({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return {
      lock_state: device.lockState,
      last_changed_at: lastEvent?.createdAt.toISOString() ?? null,
      device_online: device.isOnline,
    };
  },

  // ── POST /v1/lock/command ─────────────────────────────────────────────────
  async sendLockCommand(
    deviceId: string,
    userId: string,
    action: 'LOCK' | 'UNLOCK',
    idempotencyKey: string
  ) {
    // 1. Check if device is online
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { isOnline: true, lastKnownLat: true, lastKnownLng: true },
    });

    if (!device?.isOnline) {
      throw new AppError(
        503,
        'DEVICE_OFFLINE',
        'Cannot send command. Your bag is currently offline.'
      );
    }

    // 2. Idempotency check — prevent duplicate execution (Security.md §12)
    const existing = await prisma.lockEvent.findFirst({
      where: { idempotencyKey },
    });

    if (existing) {
      // Return existing result without re-executing
      return {
        command_id: existing.id,
        action,
        status: existing.status,
        message: 'Command already processed.',
      };
    }

    // 3. Create lock event record with PENDING status
    const lockEvent = await prisma.lockEvent.create({
      data: {
        deviceId,
        userId,
        eventType: action === 'LOCK' ? 'LOCK_COMMAND' : 'UNLOCK_COMMAND',
        initiatedBy: 'app',
        status: 'PENDING',
        idempotencyKey,
        latitude: device.lastKnownLat,
        longitude: device.lastKnownLng,
      },
    });

    // 4. Publish MQTT command to device
    const topic = TOPICS.lockCommand(deviceId);
    const mqttPayload = JSON.stringify({
      action,
      command_id: lockEvent.id,
      timestamp: new Date().toISOString(),
    });

    mqttClient.publish(topic, mqttPayload, { qos: 1 }); // QoS 1 for lock commands

    // 5. Log to activity log
    await activityLogService.log({
      userId,
      deviceId,
      eventType: action === 'LOCK' ? 'LOCK_COMMAND' : 'UNLOCK_COMMAND',
      description: `${action === 'LOCK' ? 'Lock' : 'Unlock'} command sent from app`,
      metadata: { action, command_id: lockEvent.id },
      latitude: device.lastKnownLat ?? undefined,
      longitude: device.lastKnownLng ?? undefined,
    });

    // 6. Set timeout — if no hardware ACK in 10s, mark as TIMEOUT
    setTimeout(async () => {
      const event = await prisma.lockEvent.findUnique({ where: { id: lockEvent.id } });
      if (event?.status === 'PENDING') {
        await prisma.lockEvent.update({
          where: { id: lockEvent.id },
          data: { status: 'TIMEOUT' },
        });

        const deviceOwner = await prisma.device.findUnique({
          where: { id: deviceId },
          select: { ownerUserId: true },
        });

        if (deviceOwner?.ownerUserId) {
          websocketService.broadcast(deviceOwner.ownerUserId, 'lock.command_ack', deviceId, {
            command_id: lockEvent.id,
            status: 'TIMEOUT',
          });
        }
      }
    }, COMMAND_TIMEOUT_SECONDS * 1000);

    return {
      command_id: lockEvent.id,
      action,
      status: 'PENDING',
      message: 'Command sent. Waiting for device confirmation.',
    };
  },

  // ── Process hardware lock status ACK (from MQTT) ──────────────────────────
  async processLockStatus(deviceId: string, payload: MqttLockStatusPayload): Promise<void> {
    const newState = payload.state;

    // Update device lock state
    await prisma.device.update({
      where: { id: deviceId },
      data: { lockState: newState },
    });

    // If this is a command ACK, update the lock event
    if (payload.command_id) {
      await prisma.lockEvent.updateMany({
        where: { id: payload.command_id, status: 'PENDING' },
        data: { status: 'SUCCESS' },
      });

      // Also record the confirmation event
      await prisma.lockEvent.create({
        data: {
          deviceId,
          eventType: newState === 'LOCKED' ? 'LOCK_CONFIRMED' : 'UNLOCK_CONFIRMED',
          initiatedBy: payload.initiated_by ?? 'hardware',
          status: 'SUCCESS',
        },
      });
    }

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { ownerUserId: true },
    });

    if (!device?.ownerUserId) return;

    // Broadcast lock status update
    websocketService.broadcast(device.ownerUserId, 'lock.status', deviceId, {
      lock_state: newState,
      changed_at: new Date().toISOString(),
    });

    if (payload.command_id) {
      websocketService.broadcast(device.ownerUserId, 'lock.command_ack', deviceId, {
        command_id: payload.command_id,
        status: 'SUCCESS',
      });
    }

    // Send notification for lock state change
    await notificationService.createAndSend(device.ownerUserId, {
      type: 'LOCK_STATE_CHANGE',
      title: 'Lock State Changed',
      body: `Your bag is now ${newState === 'LOCKED' ? 'locked 🔒' : 'unlocked 🔓'}.`,
      data: { type: 'LOCK_STATE_CHANGE', screen: 'lock' },
    });

    await activityLogService.log({
      userId: device.ownerUserId,
      deviceId,
      eventType: newState === 'LOCKED' ? 'LOCK_CONFIRMED' : 'UNLOCK_CONFIRMED',
      description: `Bag ${newState === 'LOCKED' ? 'locked' : 'unlocked'} (hardware confirmed)`,
    });
  },

  // ── Handle unauthorized bag opening (LOCK-03) ─────────────────────────────
  async handleUnauthorizedAccess(
    deviceId: string,
    latitude?: number,
    longitude?: number
  ): Promise<void> {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { ownerUserId: true },
    });

    if (!device?.ownerUserId) return;

    await prisma.lockEvent.create({
      data: {
        deviceId,
        eventType: 'UNAUTHORIZED_OPEN',
        initiatedBy: 'hardware',
        status: 'SUCCESS',
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      },
    });

    await notificationService.createAndSend(device.ownerUserId, {
      type: 'UNAUTHORIZED_ACCESS',
      title: 'Security Alert',
      body: '🔓 Alert! Your bag was opened while locked.',
      data: { type: 'UNAUTHORIZED_ACCESS', screen: 'lock' },
    });

    websocketService.broadcast(device.ownerUserId, 'alert.unauthorized_open', deviceId, {
      lat: latitude ?? null,
      lng: longitude ?? null,
      timestamp: new Date().toISOString(),
    });

    await activityLogService.log({
      userId: device.ownerUserId,
      deviceId,
      eventType: 'UNAUTHORIZED_ACCESS',
      description: 'Bag opened while locked — unauthorized access detected',
      latitude,
      longitude,
    });
  },

  // ── GET /v1/lock/history ──────────────────────────────────────────────────
  async getHistory(deviceId: string, limit = 20) {
    const events = await prisma.lockEvent.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        eventType: true,
        initiatedBy: true,
        status: true,
        createdAt: true,
      },
    });

    return events.map((e) => ({
      id: e.id,
      event_type: e.eventType,
      initiated_by: e.initiatedBy,
      status: e.status,
      created_at: e.createdAt.toISOString(),
    }));
  },
};
