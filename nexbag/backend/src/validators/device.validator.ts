import { z } from 'zod';

// ─── POST /v1/devices/pair ────────────────────────────────────────────────────
export const pairDeviceSchema = z
  .object({
    device_code: z
      .string()
      .min(1, 'Device code is required.')
      .max(20, 'Device code must be at most 20 characters.')
      .regex(/^[A-Z0-9-]+$/, 'Device code must contain only uppercase letters, digits, and hyphens.'),
  })
  .strip();

export type PairDeviceInput = z.infer<typeof pairDeviceSchema>;

// ─── PATCH /v1/devices/me ─────────────────────────────────────────────────────
export const updateDeviceSchema = z
  .object({
    device_name: z
      .string()
      .min(1, 'Device name is required.')
      .max(100, 'Device name must be at most 100 characters.')
      .optional(),
  })
  .strip();

export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;

// ─── PATCH /v1/users/me ───────────────────────────────────────────────────────
export const updateProfileSchema = z
  .object({
    full_name: z
      .string()
      .min(2, 'Name must be at least 2 characters.')
      .max(100, 'Name must be at most 100 characters.')
      .optional(),
  })
  .strip();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ─── POST /v1/users/me/fcm-token ─────────────────────────────────────────────
export const fcmTokenSchema = z
  .object({
    fcm_token: z.string().min(1, 'FCM token is required.'),
    platform: z.enum(['android', 'ios']),
  })
  .strip();

export type FcmTokenInput = z.infer<typeof fcmTokenSchema>;

// ─── DELETE /v1/users/me/fcm-token ───────────────────────────────────────────
export const removeFcmTokenSchema = z
  .object({
    fcm_token: z.string().min(1, 'FCM token is required.'),
  })
  .strip();

export type RemoveFcmTokenInput = z.infer<typeof removeFcmTokenSchema>;
