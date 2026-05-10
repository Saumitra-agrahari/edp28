import { Router } from 'express';
import { deviceController } from '../controllers/device.controller';
import { validate } from '../middleware/validate.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { deviceOwnerMiddleware } from '../middleware/device-owner.middleware';
import { pairDeviceSchema, updateDeviceSchema } from '../validators/device.validator';

const router = Router();
router.use(authMiddleware);

// POST /v1/devices/pair — no deviceOwnerMiddleware (user has no device yet)
router.post('/pair', validate(pairDeviceSchema), deviceController.pair);

// All other device routes require paired device
router.get('/me', deviceOwnerMiddleware, deviceController.getDevice);
router.patch('/me', deviceOwnerMiddleware, validate(updateDeviceSchema), deviceController.updateDevice);
router.delete('/me/unpair', deviceOwnerMiddleware, deviceController.unpair);

export default router;
