import { extractDeviceId, extractCategory } from './topics';
import { logger } from '../utils/logger';
import { handleHeartbeat } from './handlers/heartbeat.handler';
import { handleRfidTags } from './handlers/rfid.handler';
import { handleGpsLocation } from './handlers/gps.handler';
import { handleLockStatus } from './handlers/lock.handler';

// ─── MQTT message router ───────────────────────────────────────────────────────
// Per Architecture.md §9: routes incoming MQTT messages to appropriate handlers
// Per AI_Instructions.md §5: use try/catch in MQTT handlers (log + continue)

export async function handleMqttMessage(topic: string, message: Buffer): Promise<void> {
  const deviceId = extractDeviceId(topic);
  const category = extractCategory(topic);

  if (!deviceId || !category) {
    logger.warn(`MQTT: unrecognized topic format: ${topic}`);
    return;
  }

  logger.info(`MQTT message received`, { topic, deviceId });

  let payload: unknown;
  try {
    payload = JSON.parse(message.toString());
  } catch {
    logger.error('MQTT: failed to parse JSON payload', { topic });
    return; // Per AI_Instructions.md §5: log + continue
  }

  try {
    switch (category) {
      case 'heartbeat':
        await handleHeartbeat(deviceId, payload);
        break;
      case 'rfid/tags':
        await handleRfidTags(deviceId, payload);
        break;
      case 'gps/location':
        await handleGpsLocation(deviceId, payload);
        break;
      case 'lock/status':
        await handleLockStatus(deviceId, payload);
        break;
      case 'alert/breach':
        // Handled by lock handler
        await handleLockStatus(deviceId, payload);
        break;
      default:
        logger.debug(`MQTT: unhandled category "${category}" for device ${deviceId}`);
    }
  } catch (err) {
    // Per AI_Instructions.md §5: MQTT handlers use try/catch — log + continue
    logger.error('MQTT handler error', { err, topic, deviceId });
  }
}
