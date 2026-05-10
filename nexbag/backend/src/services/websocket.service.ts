import WebSocket from 'ws';
import { websocketManager } from '../websocket/websocket.manager';
import { WsEventName } from '../types/websocket.types';
import { logger } from '../utils/logger';

// ─── WebSocket broadcast service ──────────────────────────────────────────────
// Per Architecture.md §8: broadcasts happen in services, not in MQTT handlers directly

export const websocketService = {
  broadcast(
    userId: string,
    event: WsEventName,
    deviceId: string,
    payload: unknown
  ): void {
    const ws = websocketManager.get(userId);

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // No-op if user not connected — data will come from REST API on next request
      return;
    }

    const message = JSON.stringify({
      event,
      device_id: deviceId,
      payload,
      timestamp: new Date().toISOString(),
    });

    try {
      ws.send(message);
    } catch (err) {
      logger.error('WebSocket send failed', { err, userId, event });
      websocketManager.remove(userId);
    }
  },
};
