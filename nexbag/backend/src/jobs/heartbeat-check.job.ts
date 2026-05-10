import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { websocketService } from '../services/websocket.service';
import { notificationService } from '../services/notification.service';
import { activityLogService } from '../services/activity-log.service';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// ─── Heartbeat check job ──────────────────────────────────────────────────────
// Runs every 30 seconds — marks devices offline if no heartbeat in 60 seconds
// Per Features.md DEV-02 and AI_Instructions.md §9

export function startHeartbeatCheckJob(): void {
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const timeoutThreshold = new Date(
        Date.now() - env.HEARTBEAT_TIMEOUT_SECONDS * 1000
      );

      // Find all devices that are online but haven't sent a heartbeat within timeout
      const staleDevices = await prisma.device.findMany({
        where: {
          isOnline: true,
          OR: [
            { lastHeartbeatAt: { lt: timeoutThreshold } },
            { lastHeartbeatAt: null },
          ],
        },
        select: { id: true, ownerUserId: true, deviceName: true },
      });

      for (const device of staleDevices) {
        // Mark device offline
        await prisma.device.update({
          where: { id: device.id },
          data: { isOnline: false },
        });

        logger.warn(`Device ${device.id} marked offline (heartbeat timeout)`);

        if (!device.ownerUserId) continue;

        // Broadcast offline event to mobile app
        websocketService.broadcast(device.ownerUserId, 'device.offline', device.id, {
          device_id: device.id,
        });

        // Send push notification
        await notificationService.createAndSend(device.ownerUserId, {
          type: 'DEVICE_OFFLINE',
          title: 'Bag Offline',
          body: 'Your Smart Bag-Pack has gone offline.',
          data: { type: 'DEVICE_OFFLINE', screen: 'dashboard' },
        });

        // Activity log
        await activityLogService.log({
          userId: device.ownerUserId,
          deviceId: device.id,
          eventType: 'DEVICE_OFFLINE',
          description: 'Device went offline (heartbeat timeout)',
        });
      }
    } catch (err) {
      // Per AI_Instructions.md §5: log + continue in scheduled jobs
      logger.error('Heartbeat check job failed', { err });
    }
  });

  logger.info('Heartbeat check job started (interval: 30s)');
}
