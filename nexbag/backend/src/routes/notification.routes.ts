import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { validate } from '../middleware/validate.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  notificationsQuerySchema,
  updatePreferencesSchema,
} from '../validators/notification.validator';

const router = Router();
router.use(authMiddleware);

// GET /v1/notifications
router.get('/', validate(notificationsQuerySchema, 'query'), notificationController.getNotifications);

// PATCH /v1/notifications/:notificationId/read
router.patch('/:notificationId/read', notificationController.markRead);

// POST /v1/notifications/read-all
router.post('/read-all', notificationController.markAllRead);

// GET /v1/notifications/preferences
router.get('/preferences', notificationController.getPreferences);

// PUT /v1/notifications/preferences
router.put('/preferences', validate(updatePreferencesSchema), notificationController.updatePreferences);

export default router;
