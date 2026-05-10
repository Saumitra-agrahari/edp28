import { prisma } from '../config/prisma';
import { websocketService } from './websocket.service';
import { geofenceService } from './geofence.service';
import { activityLogService } from './activity-log.service';
import type { MqttGpsLocationPayload } from '../types/mqtt.types';

export const gpsService = {
  // ── Process incoming GPS MQTT data ─────────────────────────────────────────
  async processLocation(deviceId: string, payload: MqttGpsLocationPayload): Promise<void> {
    const now = new Date();
    const parsed = payload.timestamp ? new Date(payload.timestamp) : null;
    const isValidTimestamp = parsed instanceof Date && !Number.isNaN(parsed.getTime());
    const driftMs = isValidTimestamp ? Math.abs(now.getTime() - parsed.getTime()) : Number.POSITIVE_INFINITY;
    // Prefer device timestamp only when it is plausible; otherwise use server ingest time.
    const recordedAt = isValidTimestamp && driftMs <= 10 * 60 * 1000 ? parsed : now;

    // 1. Store in GPS history table
    await prisma.gpsLocation.create({
      data: {
        deviceId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy ?? null,
        altitude: payload.altitude ?? null,
        recordedAt,
      },
    });

    // 2. Update cached location on device record (for fast current-location reads)
    await prisma.device.update({
      where: { id: deviceId },
      data: {
        lastKnownLat: payload.latitude,
        lastKnownLng: payload.longitude,
        lastLocationAt: recordedAt,
      },
    });

    // 3. Get the device owner for WebSocket + geofence check
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { ownerUserId: true },
    });

    if (!device?.ownerUserId) return;

    // 4. Broadcast GPS update to mobile app
    websocketService.broadcast(device.ownerUserId, 'gps.update', deviceId, {
      lat: payload.latitude,
      lng: payload.longitude,
      accuracy: payload.accuracy ?? null,
      recorded_at: recordedAt.toISOString(),
    });

    // 5. Write activity log so dashboard "Recent Activity" stays in sync with live location.
    await activityLogService.log({
      userId: device.ownerUserId,
      deviceId,
      eventType: 'LOCATION_UPDATED',
      description: 'Location updated',
      metadata: {
        source: payload.source ?? 'unknown',
        recorded_at: recordedAt.toISOString(),
      },
      latitude: payload.latitude,
      longitude: payload.longitude,
    });

    // 6. Check geofence (runs server-side haversine distance per GPS-03)
    await geofenceService.checkBreach(
      deviceId,
      device.ownerUserId,
      payload.latitude,
      payload.longitude
    );
  },

  // ── GET /v1/gps/current ────────────────────────────────────────────────────
  async getCurrentLocation(deviceId: string) {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: {
        isOnline: true,
        lastKnownLat: true,
        lastKnownLng: true,
        lastLocationAt: true,
      },
    });

    if (!device?.lastKnownLat || !device?.lastKnownLng) {
      return null;
    }

    // Get accuracy from the most recent GPS location record
    const latest = await prisma.gpsLocation.findFirst({
      where: { deviceId },
      orderBy: { recordedAt: 'desc' },
      select: { accuracy: true, altitude: true },
    });

    const isStale =
      !device.isOnline ||
      !device.lastLocationAt ||
      device.lastLocationAt < new Date(Date.now() - 60_000);

    return {
      latitude: device.lastKnownLat,
      longitude: device.lastKnownLng,
      accuracy: latest?.accuracy ?? null,
      altitude: latest?.altitude ?? null,
      is_stale: isStale,
      recorded_at: device.lastLocationAt?.toISOString() ?? null,
      device_online: device.isOnline,
    };
  },

  // ── GET /v1/gps/history ────────────────────────────────────────────────────
  async getHistory(
    deviceId: string,
    from: string,
    to?: string,
    cursor?: string,
    limit = 50
  ) {
    const whereClause = {
      deviceId,
      recordedAt: {
        gte: new Date(from),
        ...(to ? { lte: new Date(to) } : {}),
      },
      ...(cursor
        ? { id: { lt: cursor } } // cursor-based pagination
        : {}),
    };

    const locations = await prisma.gpsLocation.findMany({
      where: whereClause,
      orderBy: { recordedAt: 'desc' },
      take: limit + 1,
      select: { id: true, latitude: true, longitude: true, accuracy: true, recordedAt: true },
    });

    const hasMore = locations.length > limit;
    const items = hasMore ? locations.slice(0, limit) : locations;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return {
      data: items.map((l) => ({
        id: l.id,
        latitude: l.latitude,
        longitude: l.longitude,
        accuracy: l.accuracy,
        recorded_at: l.recordedAt.toISOString(),
      })),
      meta: { next_cursor: nextCursor, count: items.length },
    };
  },
};
