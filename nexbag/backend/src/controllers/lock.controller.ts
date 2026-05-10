import { Request, Response } from 'express';
import { lockService } from '../services/lock.service';
import { successResponse, asyncHandler } from '../utils/response.utils';

export const lockController = {
  getStatus: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await lockService.getLockStatus(req.device!.id);
    successResponse(res, result, 'Lock status fetched.');
  }),

  sendCommand: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { action, idempotency_key } = req.body;
    const result = await lockService.sendLockCommand(
      req.device!.id,
      req.user!.id,
      action,
      idempotency_key
    );
    successResponse(res, result, result.message);
  }),

  getHistory: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { limit } = req.query as { limit?: string };
    const result = await lockService.getHistory(req.device!.id, Number(limit || 20));
    successResponse(res, result, 'Lock history fetched.');
  }),
};
