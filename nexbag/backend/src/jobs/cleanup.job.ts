import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// ─── Data cleanup job ─────────────────────────────────────────────────────────
// Runs daily at 2:00 AM — purges old GPS data, notifications, logs, sessions
// Per AI_Instructions.md key constants and Deployment.md §2

export function startCleanupJob(): void {
  cron.schedule('0 2 * * *', async () => {
    logger.info('Starting daily data cleanup...');

    try {
      const now = new Date();

      // 1. Delete GPS data older than 30 days (GPS_RETENTION_DAYS)
      const gpsRetentionDate = new Date(now.getTime() - env.GPS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const { count: gpsDeleted } = await prisma.gpsLocation.deleteMany({
        where: { recordedAt: { lt: gpsRetentionDate } },
      });
      logger.info(`Cleanup: deleted ${gpsDeleted} GPS records older than ${env.GPS_RETENTION_DAYS} days`);

      // 2. Delete notifications older than 90 days (NOTIFICATION_RETENTION_DAYS)
      const notifRetentionDate = new Date(now.getTime() - env.NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const { count: notifDeleted } = await prisma.notification.deleteMany({
        where: { createdAt: { lt: notifRetentionDate } },
      });
      logger.info(`Cleanup: deleted ${notifDeleted} notifications older than ${env.NOTIFICATION_RETENTION_DAYS} days`);

      // 3. Delete activity logs older than 90 days (LOG_RETENTION_DAYS)
      const logRetentionDate = new Date(now.getTime() - env.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const { count: logsDeleted } = await prisma.activityLog.deleteMany({
        where: { createdAt: { lt: logRetentionDate } },
      });
      logger.info(`Cleanup: deleted ${logsDeleted} activity logs older than ${env.LOG_RETENTION_DAYS} days`);

      // 4. Delete expired and revoked sessions
      const { count: sessionsDeleted } = await prisma.userSession.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            {
              revokedAt: {
                not: null,
                lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // Revoked > 7 days ago
              },
            },
          ],
        },
      });
      logger.info(`Cleanup: deleted ${sessionsDeleted} expired/revoked sessions`);

      // 5. Delete old tag readings (older than 60 seconds = stale) 
      // We only need recent readings for live status
      const tagReadingThreshold = new Date(now.getTime() - 5 * 60 * 1000); // older than 5 mins
      const { count: readingsDeleted } = await prisma.tagReading.deleteMany({
        where: { lastSeenAt: { lt: tagReadingThreshold } },
      });
      logger.info(`Cleanup: deleted ${readingsDeleted} stale tag readings`);

    } catch (err) {
      logger.error('Daily cleanup job failed', { err });
    }

    logger.info('Daily data cleanup complete');
  });

  logger.info('Cleanup job scheduled (daily at 02:00)');
}
