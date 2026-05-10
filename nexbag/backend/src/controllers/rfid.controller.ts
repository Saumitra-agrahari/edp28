import { Request, Response } from 'express';
import { rfidService } from '../services/rfid.service';
import { successResponse, asyncHandler } from '../utils/response.utils';

export const rfidController = {
  getTagList: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { status } = req.query as { status?: 'in_bag' | 'missing' | 'all' };
    const result = await rfidService.getTagList(req.device!.id, status);
    successResponse(res, result, 'Tags fetched successfully.');
  }),

  createTag: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tagId, epc, alias, icon } = req.body;
    const result = await rfidService.createTag(
      req.device!.id,
      req.user!.id,
      String(tagId ?? epc ?? ''),
      alias,
      icon ?? 'bag-personal'
    );
    successResponse(res, result, 'Tag registered successfully.', 201);
  }),

  updateTag: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tagId } = req.params;
    const { alias, icon, is_active } = req.body;
    const result = await rfidService.updateTag(
      tagId!,
      req.device!.id,
      req.user!.id,
      alias,
      icon,
      is_active
    );
    successResponse(res, result, 'Tag updated successfully.');
  }),

  deleteTag: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tagId } = req.params;
    await rfidService.deleteTag(tagId!, req.device!.id, req.user!.id);
    successResponse(res, null, 'Tag deleted successfully.');
  }),

  getLiveStatus: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await rfidService.getLiveStatus(req.device!.id);
    successResponse(res, result, 'Live RFID status fetched.');
  }),
};
