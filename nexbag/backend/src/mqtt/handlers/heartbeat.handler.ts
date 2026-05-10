import { prisma } from '../../config/prisma';
import { websocketService } from '../../services/websocket.service';
import { notificationService } from '../../services/notification.service';
import { activityLogService } from '../../services/activity-log.service';
import { rfidService } from '../../services/rfid.service';
import { logger } from '../../utils/logger';
import type { MqttHeartbeatPayload } from '../../types/mqtt.types';

export async function handleHeartbeat(deviceId: string, payload: unknown): Promise<void> {
  const data = payload as MqttHeartbeatPayload;

  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { isOnline: true, ownerUserId: true, lockState: true },
  });

  if (!device) {
    logger.warn(`Heartbeat from unknown device: ${deviceId}`);
    return;
  }

  const wasOffline = !device.isOnline;

  // Update device online status + last heartbeat time
  await prisma.device.update({
    where: { id: deviceId },
    data: {
      isOnline: true,
      lastHeartbeatAt: new Date(),
      ...(data.lock_state ? { lockState: data.lock_state } : {}),
      ...(data.firmware_version ? { firmwareVersion: data.firmware_version } : {}),
    },
  });

  if (
    data.lock_state &&
    (data.lock_state === 'LOCKED' || data.lock_state === 'UNLOCKED') &&
    data.lock_state !== device.lockState &&
    device.ownerUserId
  ) {
    await activityLogService.log({
      userId: device.ownerUserId,
      deviceId,
      eventType: data.lock_state === 'LOCKED' ? 'LOCK_CONFIRMED' : 'UNLOCK_CONFIRMED',
      description: `Bag ${data.lock_state === 'LOCKED' ? 'locked' : 'unlocked'} (heartbeat update)`,
      metadata: { source: 'heartbeat' },
    });
  }

  if (device.ownerUserId) {
    const items = await rfidService.buildLiveItemList(deviceId);
    const unknownTags = await rfidService.getUnknownTags(deviceId);
    websocketService.broadcast(device.ownerUserId, 'rfid.update', deviceId, {
      items,
      unknown_tags: unknownTags,
    });
  }

  // Notify if device just came back online
  if (wasOffline && device.ownerUserId) {
    logger.info(`Device ${deviceId} came online`);

    websocketService.broadcast(device.ownerUserId, 'device.online', deviceId, { device_id: deviceId });

    await notificationService.createAndSend(device.ownerUserId, {
      type: 'DEVICE_ONLINE',
      title: 'Bag Online',
      body: 'Your Smart Bag-Pack is back online.',
      data: { type: 'DEVICE_ONLINE', screen: 'dashboard' },
    });

    await activityLogService.log({
      userId: device.ownerUserId,
      deviceId,
      eventType: 'DEVICE_ONLINE',
      description: 'Device came back online',
    });
  }
}
