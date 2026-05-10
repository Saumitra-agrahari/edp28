import { prisma } from '../config/prisma';
import { AppError } from '../utils/response.utils';
import { websocketService } from './websocket.service';
import { notificationService } from './notification.service';
import { activityLogService } from './activity-log.service';
import type { MqttRfidTagsPayload } from '../types/mqtt.types';
import type { WsRfidItem } from '../types/websocket.types';

// Unknown tags list still uses a recent window to avoid stale unknown entries.
const RECENTLY_PRESENT_SECONDS = 60;
const lastScanTagCodesByDevice = new Map<string, Set<string>>();

interface ProcessTagDataOptions {
  suppressMissingNotification?: boolean;
}

interface CheckMissingItemsOptions {
  suppressNotification?: boolean;
}

function deriveTagCode(value: string): string | null {
  const normalized = String(value ?? '').trim().replace(/\s+/g, '').toUpperCase();
  if (!normalized) return null;

  if (/^\d{1,4}$/.test(normalized)) {
    return normalized.padStart(4, '0');
  }

  if (normalized.length >= 8 && normalized.length % 2 === 0) {
    try {
      const epcBytes = Buffer.from(normalized, 'hex');
      return String(epcBytes.readUInt32BE(epcBytes.length - 4) % 10000).padStart(4, '0');
    } catch {
      return null;
    }
  }

  return null;
}

export const rfidService = {
  // ── Process incoming RFID MQTT data ───────────────────────────────────────
  async processTagData(
    deviceId: string,
    payload: MqttRfidTagsPayload,
    options: ProcessTagDataOptions = {}
  ): Promise<void> {
    const now = new Date();
    const normalizedTags = payload.tags
      .map((tag) => ({
        ...tag,
        epc: String(tag.epc ?? '').trim().toUpperCase(),
        tagCode: String(tag.id ?? tag.tag_id ?? '').padStart(4, '0'),
      }))
      .filter((tag) => tag.epc.length > 0 && tag.tagCode.length === 4);
    const scannedTagCodes = normalizedTags.map((tag) => tag.tagCode);

    // Persist latest scan snapshot in memory (including empty scan cycles).
    lastScanTagCodesByDevice.set(deviceId, new Set(scannedTagCodes));

    // 1. Upsert tag readings for all received tags
    if (normalizedTags.length > 0) {
      await Promise.all(
        normalizedTags.map((tag) =>
          prisma.tagReading.upsert({
            where: {
              // Need compound unique — use raw query approach
              deviceId_epc: { deviceId, epc: tag.epc },
            },
            update: {
              rssi: tag.rssi ?? null,
              antennaId: tag.antenna_id ?? null,
              readCount: { increment: 1 },
              lastSeenAt: now,
            },
            create: {
              deviceId,
              epc: tag.epc,
              rssi: tag.rssi ?? null,
              antennaId: tag.antenna_id ?? null,
              firstSeenAt: now,
              lastSeenAt: now,
            },
          })
        )
      );
    }

    // 2. Missing is evaluated only when a new scan arrives.
    await rfidService.checkForMissingItems(deviceId, scannedTagCodes, {
      suppressNotification: options.suppressMissingNotification ?? false,
    });

    // 3. Build live item list and broadcast via WebSocket
    const liveItems = await rfidService.buildLiveItemList(deviceId);
    const registeredTags = await prisma.rfidTag.findMany({
      where: { deviceId, deletedAt: null },
      select: { epc: true },
    });
    const registeredSet = new Set(
      registeredTags
        .map((tag) => deriveTagCode(tag.epc))
        .filter((tagCode): tagCode is string => Boolean(tagCode))
    );
    const unknownTags = normalizedTags
      .filter((tag) => !registeredSet.has(tag.tagCode))
      .map((tag) => ({ epc: tag.epc, tag_id: Number(tag.tagCode) }));
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { ownerUserId: true },
    });

    if (device?.ownerUserId) {
      websocketService.broadcast(device.ownerUserId, 'rfid.update', deviceId, {
        items: liveItems,
        unknown_tags: unknownTags,
      });
    }
  },

  // ── Missing item detection (scan-based) ──────────────────────────────────
  async checkForMissingItems(
    deviceId: string,
    scannedEpcs: string[],
    options: CheckMissingItemsOptions = {}
  ): Promise<void> {
    const scannedSet = new Set(scannedEpcs.map((epc) => deriveTagCode(epc)).filter(Boolean) as string[]);

    // Consider active, registered tags that were not present in this scan.
    const [candidateTags, priorReadings, device] = await Promise.all([
      prisma.rfidTag.findMany({
        where: {
          deviceId,
          deletedAt: null,
          isActive: true,
          alias: { not: null },
        },
        select: { epc: true, alias: true },
      }),
      prisma.tagReading.findMany({
        where: { deviceId },
        select: { epc: true },
      }),
      prisma.device.findUnique({
        where: { id: deviceId },
        select: { ownerUserId: true },
      }),
    ]);

    const seenTagCodes = new Set(
      priorReadings
        .map((reading) => deriveTagCode(reading.epc))
        .filter((tagCode): tagCode is string => Boolean(tagCode))
    );
    const isEmptyScan = scannedSet.size === 0;

    let missingCount = 0;

    for (const rfidTag of candidateTags) {
      const tagCode = deriveTagCode(rfidTag.epc);
      if (tagCode && scannedSet.has(tagCode)) {
        continue;
      }

      if (!tagCode) {
        continue;
      }

      // For an empty scan, treat all registered tags as missing.
      // For partial scans, keep the safer behavior and only alert tags that have been seen before.
      if (!isEmptyScan && !seenTagCodes.has(tagCode)) {
        continue;
      }

      missingCount += 1;
    }

    if (!device?.ownerUserId || missingCount === 0) {
      return;
    }

    if (!options.suppressNotification) {
      await notificationService.createAndSend(device.ownerUserId, {
        type: 'ITEM_MISSING',
        title: 'Items Missing',
        body: '⚠️ Items are missing in your bag.',
        data: {
          type: 'ITEM_MISSING',
          screen: 'items',
          count: String(missingCount),
        },
      });

      websocketService.broadcast(device.ownerUserId, 'alert.item_missing', deviceId, {
        epc: '',
        alias: 'items are missing in your bag',
      });
    }

    await activityLogService.log({
      userId: device.ownerUserId,
      deviceId,
      eventType: 'ITEM_MISSING',
      description: 'Items are missing in your bag',
      metadata: { count: missingCount },
    });
  },

  // ── Build live item list (combines tag_readings + rfid_tags) ──────────────
  async buildLiveItemList(deviceId: string): Promise<WsRfidItem[]> {
    // Get all registered tags for this device
    const rfidTags = await prisma.rfidTag.findMany({
      where: { deviceId, deletedAt: null },
    });

    // Get readings for registered tags. Status is based on latest RFID scan snapshot.
    const readings = await prisma.tagReading.findMany({
      where: {
        deviceId,
      },
    });

    const readingMap = new Map<string, (typeof readings)[number]>();
    for (const reading of readings) {
      const code = deriveTagCode(reading.epc);
      if (code) readingMap.set(code, reading);
    }
    const lastScanTagCodes = lastScanTagCodesByDevice.get(deviceId);
    const latestScanAtMs = readings.reduce<number | null>((maxTs, reading) => {
      const ts = reading.lastSeenAt.getTime();
      if (maxTs === null || ts > maxTs) return ts;
      return maxTs;
    }, null);

    return rfidTags.map((tag) => {
      const tagCode = deriveTagCode(tag.epc);
      const reading = tagCode ? readingMap.get(tagCode) : undefined;
      let status: 'IN_BAG' | 'MISSING' | 'UNKNOWN' = 'UNKNOWN';
      const tagId = tagCode ? Number(tagCode) : null;

      if (reading && tagCode) {
        if (lastScanTagCodes) {
          status = lastScanTagCodes.has(tagCode) ? 'IN_BAG' : 'MISSING';
        } else if (latestScanAtMs !== null) {
          // Fallback for process restarts before a new RFID scan arrives.
          status = reading.lastSeenAt.getTime() === latestScanAtMs ? 'IN_BAG' : 'MISSING';
        }
      }

      return {
        id: tag.id,
        tag_id: tagId,
        epc: tag.epc,
        alias: tag.alias,
        icon: tag.icon,
        is_active: tag.isActive,
        status,
        rssi: reading?.rssi ?? null,
        antenna_id: reading?.antennaId ?? null,
        last_seen_at: reading?.lastSeenAt.toISOString() ?? null,
      };
    });
  },

  async getUnknownTags(deviceId: string): Promise<Array<{ epc: string; tag_id: number | null }>> {
    const now = new Date();
    const recentThreshold = new Date(now.getTime() - RECENTLY_PRESENT_SECONDS * 1000);

    const [registeredTags, recentReadings] = await Promise.all([
      prisma.rfidTag.findMany({
        where: { deviceId, deletedAt: null },
        select: { epc: true },
      }),
      prisma.tagReading.findMany({
        where: { deviceId, lastSeenAt: { gte: recentThreshold } },
        select: { epc: true },
      }),
    ]);

    const registered = new Set(
      registeredTags
        .map((t) => deriveTagCode(t.epc))
        .filter((tagCode): tagCode is string => Boolean(tagCode))
    );

    return recentReadings
      .map((reading) => ({
        epc: reading.epc,
        tagCode: deriveTagCode(reading.epc),
      }))
      .filter((reading) => reading.tagCode && !registered.has(reading.tagCode))
      .map((reading) => ({ epc: reading.epc, tag_id: Number(reading.tagCode) }));
  },

  // ── GET /v1/rfid/tags ─────────────────────────────────────────────────────
  async getTagList(deviceId: string, status?: 'in_bag' | 'missing' | 'all') {
    const liveItems = await rfidService.buildLiveItemList(deviceId);
    const unknownTags = await rfidService.getUnknownTags(deviceId);

    let items = liveItems;
    if (status === 'in_bag') items = liveItems.filter((i) => i.status === 'IN_BAG');
    if (status === 'missing') items = liveItems.filter((i) => i.status === 'MISSING');

    return {
      items,
      unknown_tags: unknownTags,
    };
  },

  // ── GET /v1/rfid/live ─────────────────────────────────────────────────────
  async getLiveStatus(deviceId: string) {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { isOnline: true, updatedAt: true },
    });

    const items = await rfidService.buildLiveItemList(deviceId);

    return {
      device_online: device?.isOnline ?? false,
      last_updated: device?.updatedAt.toISOString() ?? null,
      items,
    };
  },

  // ── POST /v1/rfid/tags ────────────────────────────────────────────────────
  async createTag(deviceId: string, userId: string, tagCode: string, alias: string, icon: string) {
    const normalizedTagCode = deriveTagCode(tagCode);
    if (!normalizedTagCode) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Tag ID is required.');
    }

    const existing = await prisma.rfidTag.findFirst({
      where: { deviceId, epc: normalizedTagCode },
    });

    if (existing) {
      // Update existing tag instead and reactivate if it was soft-deleted.
      const updated = await prisma.rfidTag.update({
        where: { id: existing.id },
        data: { alias, icon, deletedAt: null, isActive: true },
      });
      await activityLogService.log({
        userId,
        deviceId,
        eventType: 'TAG_ALIAS_UPDATED',
        description: `Tag alias updated: ${alias}`,
        metadata: { tag_id: normalizedTagCode },
      });
      return updated;
    }

    const tag = await prisma.rfidTag.create({
      data: { deviceId, epc: normalizedTagCode, alias, icon },
    });

    await activityLogService.log({
      userId,
      deviceId,
      eventType: 'TAG_ALIAS_ADDED',
      description: `Tag alias added: ${alias}`,
      metadata: { tag_id: normalizedTagCode },
    });

    return tag;
  },

  // ── PATCH /v1/rfid/tags/:tagId ────────────────────────────────────────────
  async updateTag(
    tagId: string,
    deviceId: string,
    userId: string,
    alias?: string,
    icon?: string,
    isActive?: boolean
  ) {
    const tag = await prisma.rfidTag.findFirst({
      where: { id: tagId, deviceId, deletedAt: null },
    });
    if (!tag) throw new AppError(404, 'NOT_FOUND', 'Tag not found.');

    const updated = await prisma.rfidTag.update({
      where: { id: tagId },
      data: {
        ...(alias !== undefined ? { alias } : {}),
        ...(icon !== undefined ? { icon } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    await activityLogService.log({
      userId,
      deviceId,
      eventType: 'TAG_ALIAS_UPDATED',
      description: `Tag alias updated: ${alias ?? tag.alias}`,
      metadata: { epc: tag.epc },
    });

    return {
      id: updated.id,
      alias: updated.alias,
      icon: updated.icon,
      is_active: updated.isActive,
    };
  },

  // ── DELETE /v1/rfid/tags/:tagId (soft delete) ─────────────────────────────
  async deleteTag(tagId: string, deviceId: string, userId: string) {
    const tag = await prisma.rfidTag.findFirst({
      where: { id: tagId, deviceId, deletedAt: null },
    });
    if (!tag) throw new AppError(404, 'NOT_FOUND', 'Tag not found.');

    await prisma.rfidTag.update({
      where: { id: tagId },
      data: { deletedAt: new Date(), alias: null },
    });

    await activityLogService.log({
      userId,
      deviceId,
      eventType: 'TAG_ALIAS_DELETED',
      description: `Tag alias deleted for EPC: ${tag.epc}`,
      metadata: { epc: tag.epc, alias: tag.alias },
    });
  },
};
