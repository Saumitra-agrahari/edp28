import { z } from 'zod';

// Valid geofence radii per Features.md GPS-02
const VALID_RADII = [50, 100, 200, 500] as const;

// ─── PUT /v1/gps/geofence ────────────────────────────────────────────────────
export const upsertGeofenceSchema = z
  .object({
    is_enabled: z.boolean(),
    center_lat: z.number().min(-90).max(90).optional(),
    center_lng: z.number().min(-180).max(180).optional(),
    radius_meters: z.number().refine((v) => VALID_RADII.includes(v as typeof VALID_RADII[number]), {
      message: 'radius_meters must be one of: 50, 100, 200, 500',
    }).optional().default(100),
  })
  .refine(
    (data) => {
      if (data.is_enabled) {
        return data.center_lat !== undefined && data.center_lng !== undefined;
      }
      return true;
    },
    { message: 'center_lat and center_lng are required when geofence is enabled.' }
  );

export type UpsertGeofenceInput = z.infer<typeof upsertGeofenceSchema>;

// ─── GET /v1/gps/history (query params) ───────────────────────────────────────
export const gpsHistoryQuerySchema = z
  .object({
    from: z.string().datetime({ message: 'from must be a valid ISO 8601 datetime.' }),
    to: z.string().datetime().optional(),
    cursor: z.string().optional(),
    limit: z.string().optional().default('50').transform(Number).pipe(z.number().min(1).max(200)),
  })
  .strip();

export type GpsHistoryQuery = z.infer<typeof gpsHistoryQuerySchema>;
