import { prisma } from '../config/prisma';
import { haversineDistance } from '../utils/haversine.utils';
import { websocketService } from './websocket.service';
import { notificationService } from './notification.service';
import { activityLogService } from './activity-log.service';

export const geofenceService = {
  // ── GET /v1/gps/geofence ─────────────────────────────────────────────────
  async getConfig(_userId: string, deviceId: string) {
    const config = await prisma.geofenceConfig.findUnique({
      where: { deviceId },
    });

    if (!config) return null;

    return {
      id: config.id,
      is_enabled: config.isEnabled,
      center_lat: config.centerLat,
      center_lng: config.centerLng,
      radius_meters: config.radiusMeters,
    };
  },

  // ── PUT /v1/gps/geofence ─────────────────────────────────────────────────
  async upsertConfig(
    userId: string,
    deviceId: string,
    isEnabled: boolean,
    centerLat?: number,
    centerLng?: number,
    radiusMeters = 100
  ) {
    const existing = await prisma.geofenceConfig.findUnique({ where: { deviceId } });

    const data = {
      isEnabled,
      centerLat: centerLat ?? existing?.centerLat ?? 0,
      centerLng: centerLng ?? existing?.centerLng ?? 0,
      radiusMeters,
    };

    const config = await prisma.geofenceConfig.upsert({
      where: { deviceId },
      update: data,
      create: { userId, deviceId, ...data },
    });

    return {
      id: config.id,
      is_enabled: config.isEnabled,
      center_lat: config.centerLat,
      center_lng: config.centerLng,
      radius_meters: config.radiusMeters,
    };
  },

  // ── Check geofence breach on each GPS update (GPS-03) ─────────────────────
  // State machine: INSIDE → OUTSIDE fires alert once; won't re-fire until re-enters
  async checkBreach(
    deviceId: string,
    userId: string,
    lat: number,
    lng: number
  ): Promise<void> {
    const config = await prisma.geofenceConfig.findUnique({ where: { deviceId } });

    if (!config || !config.isEnabled) return;

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { geofenceState: true },
    });

    if (!device) return;

    const distanceMeters = haversineDistance(lat, lng, config.centerLat, config.centerLng);
    const isInside = distanceMeters <= config.radiusMeters;
    const currentState = device.geofenceState;

    if (!isInside && currentState === 'INSIDE') {
      // Transition INSIDE → OUTSIDE: fire alert
      await geofenceService.handleBreach(deviceId, userId, lat, lng);
    } else if (isInside && currentState === 'OUTSIDE') {
      // Transition OUTSIDE → INSIDE: clear alert
      await geofenceService.handleReturn(deviceId, userId, lat, lng);
    }
    // If state unchanged, do nothing (prevents spam per GPS-03)
  },

  // ── Handle breach: INSIDE → OUTSIDE ──────────────────────────────────────
  async handleBreach(deviceId: string, userId: string, lat: number, lng: number): Promise<void> {
    // Update device state
    await prisma.device.update({
      where: { id: deviceId },
      data: { geofenceState: 'OUTSIDE' },
    });

    // Send FCM push notification
    await notificationService.createAndSend(userId, {
      type: 'GEOFENCE_BREACH',
      title: 'Anti-Theft Alert',
      body: '🚨 Your bag has moved outside your safe zone.',
      data: { type: 'GEOFENCE_BREACH', screen: 'map', lat: String(lat), lng: String(lng) },
    });

    // WebSocket high-priority alert
    websocketService.broadcast(userId, 'alert.geofence_breach', deviceId, { lat, lng });

    // Activity log
    await activityLogService.log({
      userId,
      deviceId,
      eventType: 'GEOFENCE_BREACH',
      description: 'Bag moved outside geofence safe zone',
      latitude: lat,
      longitude: lng,
    });
  },

  // ── Handle return: OUTSIDE → INSIDE ──────────────────────────────────────
  async handleReturn(deviceId: string, userId: string, lat: number, lng: number): Promise<void> {
    await prisma.device.update({
      where: { id: deviceId },
      data: { geofenceState: 'INSIDE' },
    });

    await activityLogService.log({
      userId,
      deviceId,
      eventType: 'GEOFENCE_RETURN',
      description: 'Bag returned inside geofence safe zone',
      latitude: lat,
      longitude: lng,
    });
  },
};
