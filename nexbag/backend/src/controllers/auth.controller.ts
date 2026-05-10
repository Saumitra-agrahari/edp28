import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { successResponse, asyncHandler } from '../utils/response.utils';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await authService.register(req.body, req.ip ?? undefined);
    successResponse(res, result, 'Account created successfully.', 201);
  }),

  login: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password, remember_me } = req.body;
    const deviceInfo = req.headers['user-agent'] ?? undefined;
    const result = await authService.login(
      email,
      password,
      remember_me ?? false,
      req.ip ?? undefined,
      deviceInfo
    );
    successResponse(res, result, 'Login successful.');
  }),

  refresh: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await authService.refresh(req.body.refresh_token);
    successResponse(res, result, 'Tokens refreshed.');
  }),

  logout: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await authService.logout(req.user!.id, req.body.refresh_token);
    successResponse(res, null, 'Logged out successfully.');
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await authService.forgotPassword(req.body.email);
    successResponse(res, result, result.message);
  }),

  verifyOtp: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await authService.verifyOtpForReset(req.body.email, req.body.otp);
    successResponse(res, result, 'OTP verified successfully.');
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await authService.resetPassword(req.body.reset_token, req.body.new_password);
    successResponse(res, null, 'Password reset successfully. Please log in with your new password.');
  }),
};
