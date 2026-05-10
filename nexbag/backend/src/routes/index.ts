import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { mqttClient } from '../mqtt/mqtt.client';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import deviceRoutes from './device.routes';
import rfidRoutes from './rfid.routes';
import gpsRoutes from './gps.routes';
import lockRoutes from './lock.routes';
import notificationRoutes from './notification.routes';
import activityLogRoutes from './activity-log.routes';

const router = Router();

// ── Health check (no auth required) ────────────────────────────────────────────
// Per Deployment.md §6: GET /v1/health
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const mqttOk = mqttClient?.connected ?? false;

  const status = dbOk && mqttOk ? 'ok' : 'degraded';

  res.status(dbOk ? 200 : 503).json({
    status,
    database: dbOk ? 'connected' : 'disconnected',
    mqtt: mqttOk ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ──────────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/devices', deviceRoutes);
router.use('/rfid', rfidRoutes);
router.use('/gps', gpsRoutes);
router.use('/lock', lockRoutes);
router.use('/notifications', notificationRoutes);
router.use('/activity-logs', activityLogRoutes);

// ── 404 for unmatched routes ────────────────────────────────────────────────────
router.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' },
  });
});

export default router;
