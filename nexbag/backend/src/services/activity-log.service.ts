import { prisma } from '../config/prisma';

interface LogInput {
  userId?: string;
  deviceId?: string;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
}

export const activityLogService = {
  // ── Write event to activity_logs ───────────────────────────────────────────
  async log(input: LogInput): Promise<void> {
    await prisma.activityLog.create({
      data: {
        userId: input.userId ?? null,
        deviceId: input.deviceId ?? null,
        eventType: input.eventType,
        description: input.description,
        metadata: input.metadata ? (input.metadata as object) : undefined,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      },
    });
  },

  // ── GET /v1/activity-logs (cursor paginated + filtered) ────────────────────
  async getFiltered(
    userId: string,
    cursor?: string,
    limit = 25,
    eventType?: string,
    from?: string,
    to?: string
  ) {
    const where = {
      userId,
      ...(eventType ? { eventType } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(cursor ? { id: { lt: cursor } } : {}),
    };

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      select: {
        id: true,
        eventType: true,
        description: true,
        metadata: true,
        latitude: true,
        longitude: true,
        createdAt: true,
      },
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return {
      data: items.map((l) => ({
        id: l.id,
        event_type: l.eventType,
        description: l.description,
        metadata: l.metadata,
        latitude: l.latitude,
        longitude: l.longitude,
        created_at: l.createdAt.toISOString(),
      })),
      meta: { next_cursor: nextCursor, count: items.length },
    };
  },
};
