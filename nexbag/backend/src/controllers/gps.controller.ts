import { Request, Response } from 'express';
import { gpsService } from '../services/gps.service';
import { geofenceService } from '../services/geofence.service';
import { successResponse, asyncHandler } from '../utils/response.utils';

export const gpsController = {
  getCurrentLocation: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await gpsService.getCurrentLocation(req.device!.id);
    successResponse(res, result, 'Current location fetched.');
  }),

  getHistory: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { from, to, cursor, limit } = req.query as Record<string, string>;
    const result = await gpsService.getHistory(req.device!.id, from!, to, cursor, Number(limit || 50));
    successResponse(res, result.data, 'Location history fetched.', 200, result.meta);
  }),

  getGeofence: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const config = await geofenceService.getConfig(req.user!.id, req.device!.id);
    successResponse(res, config, 'Geofence config fetched.');
  }),

  upsertGeofence: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { is_enabled, center_lat, center_lng, radius_meters } = req.body;
    const result = await geofenceService.upsertConfig(
      req.user!.id,
      req.device!.id,
      is_enabled,
      center_lat,
      center_lng,
      radius_meters
    );
    successResponse(res, result, 'Geofence config updated.');
  }),
};
