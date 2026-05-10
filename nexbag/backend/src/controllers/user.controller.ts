import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { successResponse, asyncHandler } from '../utils/response.utils';

export const userController = {
  getProfile: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = await userService.getProfile(req.user!.id);
    successResponse(res, user, 'Profile fetched successfully.');
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await userService.updateProfile(req.user!.id, req.body.full_name);
    successResponse(res, result, 'Profile updated successfully.');
  }),

  changePassword: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { current_password, new_password } = req.body;
    await userService.changePassword(req.user!.id, current_password, new_password);
    successResponse(res, null, 'Password changed successfully.');
  }),

  registerFcmToken: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await userService.registerFcmToken(req.user!.id, req.body.fcm_token, req.body.platform);
    successResponse(res, null, 'FCM token registered.', 201);
  }),

  removeFcmToken: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await userService.removeFcmToken(req.user!.id, req.body.fcm_token);
    successResponse(res, null, 'FCM token removed.');
  }),
};
