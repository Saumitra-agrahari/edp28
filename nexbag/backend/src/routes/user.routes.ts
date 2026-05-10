import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { validate } from '../middleware/validate.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  updateProfileSchema,
  fcmTokenSchema,
  removeFcmTokenSchema,
} from '../validators/device.validator';
import { changePasswordSchema } from '../validators/auth.validator';

const router = Router();

// All user routes require auth
router.use(authMiddleware);

// GET /v1/users/me
router.get('/me', userController.getProfile);

// PATCH /v1/users/me
router.patch('/me', validate(updateProfileSchema), userController.updateProfile);

// POST /v1/users/me/password
router.post('/me/password', validate(changePasswordSchema), userController.changePassword);

// POST /v1/users/me/fcm-token
router.post('/me/fcm-token', validate(fcmTokenSchema), userController.registerFcmToken);

// DELETE /v1/users/me/fcm-token
router.delete('/me/fcm-token', validate(removeFcmTokenSchema), userController.removeFcmToken);

export default router;
