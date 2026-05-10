import { rfidService } from '../../services/rfid.service';
import { cancelPendingMissingCheck } from './lock.handler';
import { logger } from '../../utils/logger';
import type { MqttRfidTagsPayload } from '../../types/mqtt.types';

export async function handleRfidTags(deviceId: string, payload: unknown): Promise<void> {
  const raw = payload as
    | MqttRfidTagsPayload
    | Array<Record<string, unknown>>
    | Record<string, unknown>;

  const rawTags = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as Record<string, unknown>)?.tags)
      ? ((raw as Record<string, unknown>).tags as Array<Record<string, unknown>>)
      : [];

  const tags = rawTags
    .map((tag) => {
      const epc = String(tag.epc ?? '').trim().toUpperCase();
      if (!epc) return null;

      const maybeTagId = tag.tag_id ?? tag.id;
      const tagId =
        typeof maybeTagId === 'number' && Number.isFinite(maybeTagId)
          ? Math.trunc(maybeTagId)
          : null;

      const rssi = typeof tag.rssi === 'number' ? Math.trunc(tag.rssi) : null;
      const antennaId =
        typeof tag.antenna_id === 'number' ? Math.trunc(tag.antenna_id) : null;

      return {
        epc,
        tag_id: tagId,
        id: tagId,
        rssi,
        antenna_id: antennaId,
      };
    })
    .filter((tag): tag is NonNullable<typeof tag> => tag !== null);

  const data: MqttRfidTagsPayload = {
    tags,
    timestamp:
      typeof (raw as Record<string, unknown>)?.timestamp === 'string'
        ? ((raw as Record<string, unknown>).timestamp as string)
        : new Date().toISOString(),
    source:
      typeof (raw as Record<string, unknown>)?.source === 'string'
        ? ((raw as Record<string, unknown>).source as string)
        : undefined,
  };

  if (!Array.isArray(data.tags)) {
    logger.warn('RFID handler: invalid payload — tags must be an array', { deviceId });
    return;
  }

  logger.info(`RFID scan: ${data.tags.length} tags from device ${deviceId}`);
  cancelPendingMissingCheck(deviceId);
  await rfidService.processTagData(deviceId, data);
}
