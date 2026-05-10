import { lockService } from '../../services/lock.service';
import { rfidService } from '../../services/rfid.service';
import { logger } from '../../utils/logger';
import type { MqttLockStatusPayload, MqttAlertBreachPayload } from '../../types/mqtt.types';

const PENDING_MISSING_DELAY_MS = 3000;
const pendingMissingChecks = new Map<string, NodeJS.Timeout>();

export function cancelPendingMissingCheck(deviceId: string): void {
  const pending = pendingMissingChecks.get(deviceId);
  if (pending) {
    clearTimeout(pending);
    pendingMissingChecks.delete(deviceId);
  }
}

export async function handleLockStatus(deviceId: string, payload: unknown): Promise<void> {
  const data = payload as MqttLockStatusPayload;

  if (!data.state || !['LOCKED', 'UNLOCKED'].includes(data.state)) {
    // Check if this is an unauthorized access alert
    const breachData = payload as MqttAlertBreachPayload;
    logger.info(`Unauthorized access alert for device ${deviceId}`);
    await lockService.handleUnauthorizedAccess(
      deviceId,
      breachData.latitude,
      breachData.longitude
    );
    return;
  }

  if (!data.timestamp) {
    data.timestamp = new Date().toISOString();
  }

  logger.info(`Lock status: ${data.state} for device ${deviceId}`, {
    command_id: data.command_id,
  });

  await lockService.processLockStatus(deviceId, data);

  cancelPendingMissingCheck(deviceId);

  // Give RFID a short window to report the scan after lock.
  if (data.state === 'LOCKED') {
    const timer = setTimeout(() => {
      pendingMissingChecks.delete(deviceId);

      void rfidService.processTagData(deviceId, {
        tags: [],
        timestamp: data.timestamp,
        source: 'lock/status',
      });
    }, PENDING_MISSING_DELAY_MS);

    pendingMissingChecks.set(deviceId, timer);
  }
}
