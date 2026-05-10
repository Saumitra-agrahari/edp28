import { Router } from 'express';
import { lockController } from '../controllers/lock.controller';
import { validate } from '../middleware/validate.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { deviceOwnerMiddleware } from '../middleware/device-owner.middleware';
import { lockCommandRateLimit } from '../middleware/rate-limit.middleware';
import { lockCommandSchema, lockHistoryQuerySchema } from '../validators/lock.validator';

const router = Router();
router.use(authMiddleware, deviceOwnerMiddleware);

// GET /v1/lock/status
router.get('/status', lockController.getStatus);

// POST /v1/lock/command — special rate limit (30/min)
router.post('/command', lockCommandRateLimit, validate(lockCommandSchema), lockController.sendCommand);

// GET /v1/lock/history
router.get('/history', validate(lockHistoryQuerySchema, 'query'), lockController.getHistory);

export default router;
