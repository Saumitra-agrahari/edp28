import { Request, Response } from 'express';
import { deviceService } from '../services/device.service';
import { successResponse, asyncHandler } from '../utils/response.utils';

export const deviceController = {
  pair: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await deviceService.pairDevice(req.user!.id, req.body.device_code);
    successResponse(res, result, 'Device paired successfully.', 201);
  }),

  getDevice: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await deviceService.getDevice(req.device!.id);
    successResponse(res, result, 'Device fetched successfully.');
  }),

  updateDevice: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await deviceService.updateDevice(req.device!.id, req.body.device_name);
    successResponse(res, result, 'Device updated successfully.');
  }),

  unpair: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await deviceService.unpairDevice(req.user!.id, req.device!.id);
    successResponse(res, null, 'Device unpaired successfully.');
  }),
};
