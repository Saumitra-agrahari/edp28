import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/prisma';
import { initFirebase } from './config/firebase';
import { initMqttClient } from './mqtt/mqtt.client';
import { initWebSocketServer } from './websocket/websocket.server';
import { startHeartbeatCheckJob } from './jobs/heartbeat-check.job';
import { startCleanupJob } from './jobs/cleanup.job';

function isTransientFirebaseDnsError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;

  const code = (err as { code?: string }).code;
  const message = String((err as { message?: string }).message ?? '').toLowerCase();

  return (
    code === 'app/network-error' &&
    (message.includes('fcm.googleapis.com') || message.includes('enotfound'))
  );
}

async function bootstrap(): Promise<void> {
  // ── Express app ─────────────────────────────────────────────────────────────
  const app = createApp();
  const server = http.createServer(app);

  // ── Firebase Admin SDK ──────────────────────────────────────────────────────
  initFirebase();

  // ── WebSocket server ────────────────────────────────────────────────────────
  initWebSocketServer(server);
  logger.info('WebSocket server attached');

  // ── MQTT client ─────────────────────────────────────────────────────────────
  await initMqttClient();
  logger.info('MQTT client connected');

  // ── Cron jobs ───────────────────────────────────────────────────────────────
  startHeartbeatCheckJob();
  startCleanupJob();
  logger.info('Scheduled jobs started');

  // ── Start HTTP server ───────────────────────────────────────────────────────
  server.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`🚀 Smart Bag-Pack backend running on port ${env.PORT}`, {
      environment: env.NODE_ENV,
    });
  });

  // ── Graceful shutdown (SIGTERM + SIGINT) ────────────────────────────────────
  // Per AI_Instructions.md §9
  const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      logger.info('HTTP server closed');
      await prisma.$disconnect();
      logger.info('Database connection closed');
      process.exit(0);
    });

    // Force shutdown if graceful close takes too long
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason });
  });

  process.on('uncaughtException', (err) => {
    if (isTransientFirebaseDnsError(err)) {
      logger.warn('Transient Firebase DNS/network error ignored', { err });
      return;
    }

    logger.error('Uncaught exception', { err });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error('Fatal startup error', { err });
  process.exit(1);
});
