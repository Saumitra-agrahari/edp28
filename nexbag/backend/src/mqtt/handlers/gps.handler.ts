import { gpsService } from '../../services/gps.service';
import { logger } from '../../utils/logger';
import type { MqttGpsLocationPayload } from '../../types/mqtt.types';

export async function handleGpsLocation(deviceId: string, payload: unknown): Promise<void> {
  const raw = payload as Record<string, unknown>;

  const latitude =
    typeof raw.latitude === 'number'
      ? raw.latitude
      : typeof raw.lat === 'number'
        ? raw.lat
        : null;
  const longitude =
    typeof raw.longitude === 'number'
      ? raw.longitude
      : typeof raw.lon === 'number'
        ? raw.lon
        : null;

  const data: MqttGpsLocationPayload = {
    latitude: latitude ?? 0,
    longitude: longitude ?? 0,
    accuracy: typeof raw.accuracy === 'number' ? raw.accuracy : undefined,
    altitude: typeof raw.altitude === 'number' ? raw.altitude : undefined,
    source: typeof raw.source === 'string' ? raw.source : undefined,
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
  };

  if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
    logger.warn('GPS handler: invalid payload — latitude/longitude required', { deviceId });
    return;
  }

  // Inject timestamp if not present
  if (!data.timestamp) {
    data.timestamp = new Date().toISOString();
  }

  await gpsService.processLocation(deviceId, data);
}
