import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { activityLogService } from '../services/activity-log.service';
import { successResponse, asyncHandler } from '../utils/response.utils';

export const notificationController = {
  getNotifications: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { cursor, limit, type, unread_only } = req.query as Record<string, string>;
    const result = await notificationService.getNotifications(
      req.user!.id,
      cursor,
      Number(limit || 20),
      type,
      unread_only === 'true'
    );
    successResponse(res, result.data, 'Notifications fetched.', 200, result.meta);
  }),

  markRead: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await notificationService.markRead(req.user!.id, req.params.notificationId!);
    successResponse(res, result, 'Notification marked as read.');
  }),

  markAllRead: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await notificationService.markAllRead(req.user!.id);
    successResponse(res, null, 'All notifications marked as read.');
  }),

  getPreferences: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await notificationService.getPreferences(req.user!.id);
    successResponse(res, result, 'Preferences fetched.');
  }),

  updatePreferences: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { preferences, quiet_hours } = req.body;
    await notificationService.updatePreferences(req.user!.id, preferences, quiet_hours);
    successResponse(res, null, 'Preferences updated.');
  }),
};

export const activityLogController = {
  getActivityLogs: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { cursor, limit, event_type, from, to } = req.query as Record<string, string>;
    const result = await activityLogService.getFiltered(
      req.user!.id,
      cursor,
      Number(limit || 25),
      event_type,
      from,
      to
    );
    successResponse(res, result.data, 'Activity logs fetched.', 200, result.meta);
  }),
};
