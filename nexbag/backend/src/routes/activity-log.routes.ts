import { Router } from 'express';
import { activityLogController } from '../controllers/notification.controller';
import { validate } from '../middleware/validate.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { activityLogsQuerySchema } from '../validators/notification.validator';

const router = Router();
router.use(authMiddleware);

// GET /v1/activity-logs
router.get('/', validate(activityLogsQuerySchema, 'query'), activityLogController.getActivityLogs);

export default router;
