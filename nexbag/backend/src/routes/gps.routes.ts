import { Router } from 'express';
import { gpsController } from '../controllers/gps.controller';
import { validate } from '../middleware/validate.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { deviceOwnerMiddleware } from '../middleware/device-owner.middleware';
import { upsertGeofenceSchema, gpsHistoryQuerySchema } from '../validators/gps.validator';

const router = Router();
router.use(authMiddleware, deviceOwnerMiddleware);

// GET /v1/gps/current
router.get('/current', gpsController.getCurrentLocation);

// GET /v1/gps/history
router.get('/history', validate(gpsHistoryQuerySchema, 'query'), gpsController.getHistory);

// GET /v1/gps/geofence
router.get('/geofence', gpsController.getGeofence);

// PUT /v1/gps/geofence
router.put('/geofence', validate(upsertGeofenceSchema), gpsController.upsertGeofence);

export default router;
