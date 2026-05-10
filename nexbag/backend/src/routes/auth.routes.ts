import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  loginRateLimit,
  registerRateLimit,
  forgotPasswordRateLimit,
  verifyOtpRateLimit,
} from '../middleware/rate-limit.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();

// POST /v1/auth/register
router.post('/register', registerRateLimit, validate(registerSchema), authController.register);

// POST /v1/auth/login
router.post('/login', loginRateLimit, validate(loginSchema), authController.login);

// POST /v1/auth/token/refresh
router.post('/token/refresh', validate(refreshTokenSchema), authController.refresh);

// POST /v1/auth/logout  (requires auth)
router.post('/logout', authMiddleware, validate(logoutSchema), authController.logout);

// POST /v1/auth/password/forgot
router.post('/password/forgot', forgotPasswordRateLimit, validate(forgotPasswordSchema), authController.forgotPassword);

// POST /v1/auth/password/verify-otp
router.post('/password/verify-otp', verifyOtpRateLimit, validate(verifyOtpSchema), authController.verifyOtp);

// POST /v1/auth/password/reset
router.post('/password/reset', validate(resetPasswordSchema), authController.resetPassword);

export default router;
