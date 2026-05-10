import { Server } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { verifyAccessToken } from '../utils/jwt.utils';
import { websocketManager } from './websocket.manager';
import { logger } from '../utils/logger';

// ─── WebSocket server initialization ─────────────────────────────────────────
// Attaches to existing HTTP server, handles JWT auth on handshake
// Per API.md §12: ws://host/ws?token=<access_token>

export function initWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    // ── Authenticate via JWT query param ─────────────────────────────────────
    const url = new URL(req.url ?? '', `ws://localhost`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Missing token');
      return;
    }

    let userId: string;
    let deviceId: string | null;

    try {
      const payload = verifyAccessToken(token);
      userId = payload.sub;
      deviceId = payload.device_id;
    } catch {
      ws.close(1008, 'Invalid token');
      return;
    }

    // ── Register connection ───────────────────────────────────────────────────
    websocketManager.add(userId, ws);
    logger.info('WebSocket connected', { userId, activeConnections: websocketManager.count() });

    // ── Handle ping from client (keepalive per API.md §12) ───────────────────
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.event === 'ping') {
          ws.send(
            JSON.stringify({
              event: 'pong',
              device_id: deviceId ?? '',
              payload: {},
              timestamp: new Date().toISOString(),
            })
          );
        }
      } catch {
        // Ignore malformed messages
      }
    });

    // ── Handle disconnect ─────────────────────────────────────────────────────
    ws.on('close', () => {
      websocketManager.remove(userId);
      logger.info('WebSocket disconnected', { userId });
    });

    ws.on('error', (err) => {
      logger.error('WebSocket error', { err, userId });
      websocketManager.remove(userId);
    });
  });

  logger.info('WebSocket server initialized on path /ws');
  return wss;
}
