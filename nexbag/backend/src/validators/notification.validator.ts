import { z } from 'zod';

const NOTIFICATION_TYPES = [
  'ITEM_MISSING',
  'GEOFENCE_BREACH',
  'UNAUTHORIZED_ACCESS',
  'LOCK_STATE_CHANGE',
  'DEVICE_OFFLINE',
  'DEVICE_ONLINE',
] as const;

// ─── GET /v1/notifications (query params) ────────────────────────────────────
export const notificationsQuerySchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.string().optional().default('20').transform(Number).pipe(z.number().min(1).max(50)),
    type: z.enum(NOTIFICATION_TYPES).optional(),
    unread_only: z
      .string()
      .optional()
      .transform((v) => v === 'true'),
  })
  .strip();

export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>;

// ─── PUT /v1/notifications/preferences ───────────────────────────────────────
export const updatePreferencesSchema = z
  .object({
    preferences: z
      .array(
        z.object({
          type: z.enum(NOTIFICATION_TYPES),
          is_enabled: z.boolean(),
        })
      )
      .optional(),
    quiet_hours: z
      .object({
        enabled: z.boolean(),
        start: z
          .string()
          .regex(/^\d{2}:\d{2}$/, "Quiet hours start must be in HH:MM format.")
          .optional(),
        end: z
          .string()
          .regex(/^\d{2}:\d{2}$/, "Quiet hours end must be in HH:MM format.")
          .optional(),
      })
      .optional(),
  })
  .strip();

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

// ─── GET /v1/activity-logs (query params) ────────────────────────────────────
export const activityLogsQuerySchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.string().optional().default('25').transform(Number).pipe(z.number().min(1).max(100)),
    event_type: z.string().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .strip();

export type ActivityLogsQuery = z.infer<typeof activityLogsQuerySchema>;
