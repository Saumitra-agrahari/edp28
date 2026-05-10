import { prisma } from '../config/prisma';
import { getMessaging, isFirebaseReady } from '../config/firebase';
import { logger } from '../utils/logger';
import { AppError } from '../utils/response.utils';

// Critical notification types cannot be fully disabled (NOTIF-03)
const CRITICAL_TYPES = ['GEOFENCE_BREACH', 'UNAUTHORIZED_ACCESS'];

interface CreateNotificationInput {
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const notificationService = {
  // ── Create notification in DB + conditionally send FCM push ───────────────
  async createAndSend(userId: string, input: CreateNotificationInput): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { quietHoursEnabled: true, quietHoursStart: true, quietHoursEnd: true },
    });

    // Always store notification in DB regardless of preference
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ? (input.data as object) : undefined,
      },
    });

    // Check user preference for this type
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId_notificationType: { userId, notificationType: input.type } },
    });

    const isCritical = CRITICAL_TYPES.includes(input.type);
    const isEnabled = pref?.isEnabled ?? true;

    if (!isEnabled && !isCritical) {
      // Non-critical + user disabled — skip FCM push
      return;
    }

    // Check quiet hours (only for non-critical)
    if (!isCritical && user?.quietHoursEnabled) {
      if (isInQuietHours(user.quietHoursStart, user.quietHoursEnd)) {
        return;
      }
    }

    // Send FCM push
    await notificationService.sendFcmPush(userId, notification.id, input);
  },

  // ── Send FCM push to all user devices ────────────────────────────────────
  async sendFcmPush(userId: string, notificationId: string, input: CreateNotificationInput): Promise<void> {
    if (!isFirebaseReady()) {
      logger.warn('Firebase not configured — skipping FCM push (dev mode)');
      return;
    }

    const tokens = await prisma.userDeviceToken.findMany({
      where: { userId },
      select: { fcmToken: true },
    });

    if (tokens.length === 0) return;

    const messaging = getMessaging();
    if (!messaging) return;

    const messages = tokens.map((t) => ({
      token: t.fcmToken,
      notification: { title: input.title, body: input.body },
      data: { ...input.data, notification_id: notificationId },
      android: { priority: 'high' as const },
      apns: { payload: { aps: { sound: 'default' } } },
    }));

    try {
      await messaging.sendEach(messages);
      await prisma.notification.update({
        where: { id: notificationId },
        data: { fcmSent: true, fcmSentAt: new Date() },
      });
    } catch (err) {
      logger.error('FCM send failed', { err, userId });
      // Don't throw — notification is already in DB
    }
  },

  // ── GET /v1/notifications (paginated) ─────────────────────────────────────
  async getNotifications(
    userId: string,
    cursor?: string,
    limit = 20,
    type?: string,
    unreadOnly?: boolean
  ) {
    const where = {
      userId,
      ...(type ? { type } : {}),
      ...(unreadOnly ? { isRead: false } : {}),
      ...(cursor ? { id: { lt: cursor } } : {}),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          isRead: true,
          data: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return {
      data: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        is_read: n.isRead,
        data: n.data,
        created_at: n.createdAt.toISOString(),
      })),
      meta: { unread_count: unreadCount, next_cursor: nextCursor },
    };
  },

  // ── PATCH /:id/read ────────────────────────────────────────────────────────
  async markRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new AppError(404, 'NOT_FOUND', 'Notification not found.');

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
      select: { id: true, isRead: true },
    });
  },

  // ── POST /read-all ─────────────────────────────────────────────────────────
  async markAllRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  },

  // ── GET /preferences ──────────────────────────────────────────────────────
  async getPreferences(userId: string) {
    const prefs = await prisma.notificationPreference.findMany({
      where: { userId },
      select: { notificationType: true, isEnabled: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { quietHoursEnabled: true, quietHoursStart: true, quietHoursEnd: true },
    });

    return {
      preferences: prefs.map((p) => ({ type: p.notificationType, is_enabled: p.isEnabled })),
      quiet_hours: {
        enabled: user?.quietHoursEnabled ?? false,
        start: user?.quietHoursStart ?? null,
        end: user?.quietHoursEnd ?? null,
      },
    };
  },

  // ── PUT /preferences ──────────────────────────────────────────────────────
  async updatePreferences(
    userId: string,
    preferences?: Array<{ type: string; is_enabled: boolean }>,
    quietHours?: { enabled: boolean; start?: string; end?: string }
  ) {
    if (preferences && preferences.length > 0) {
      await Promise.all(
        preferences.map((pref) =>
          prisma.notificationPreference.upsert({
            where: { userId_notificationType: { userId, notificationType: pref.type } },
            update: { isEnabled: pref.is_enabled },
            create: { userId, notificationType: pref.type, isEnabled: pref.is_enabled },
          })
        )
      );
    }

    if (quietHours) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          quietHoursEnabled: quietHours.enabled,
          quietHoursStart: quietHours.start ?? null,
          quietHoursEnd: quietHours.end ?? null,
        },
      });
    }
  },
};

// ── Quiet hours check ─────────────────────────────────────────────────────────
function isInQuietHours(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  const startMinutes = (startH ?? 0) * 60 + (startM ?? 0);
  const endMinutes = (endH ?? 0) * 60 + (endM ?? 0);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Crosses midnight (e.g., 23:00 → 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}
