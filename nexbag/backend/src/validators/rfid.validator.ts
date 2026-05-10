import { z } from 'zod';

// ─── POST /v1/rfid/tags ───────────────────────────────────────────────────────
export const createRfidTagSchema = z
  .object({
    tagId: z
      .string()
      .trim()
      .min(1, 'Tag ID is required.')
      .max(4, 'Tag ID must be at most 4 digits.')
      .regex(/^\d+$/, 'Tag ID must contain only digits.')
      .optional(),
    epc: z
      .string()
      .trim()
      .min(1)
      .max(64, 'EPC must be at most 64 characters.')
      .optional(),
    alias: z
      .string()
      .min(1, 'Alias is required.')
      .max(50, 'Alias must be at most 50 characters.'),  // RFID-02: max 50 chars
    icon: z.string().max(30).optional().default('bag-personal'),
  })
  .strip()
  .refine((value) => Boolean(value.tagId || value.epc), {
    message: 'Tag ID is required.',
    path: ['tagId'],
  })

export type CreateRfidTagInput = z.infer<typeof createRfidTagSchema>;

// ─── PATCH /v1/rfid/tags/:tagId ──────────────────────────────────────────────
export const updateRfidTagSchema = z
  .object({
    alias: z
      .string()
      .min(1)
      .max(50, 'Alias must be at most 50 characters.')
      .optional(),
    icon: z.string().max(30).optional(),
    is_active: z.boolean().optional(),
  })
  .strip();

export type UpdateRfidTagInput = z.infer<typeof updateRfidTagSchema>;

// ─── GET /v1/rfid/tags (query params) ────────────────────────────────────────
export const rfidTagsQuerySchema = z
  .object({
    status: z.enum(['in_bag', 'missing', 'all']).optional().default('all'),
  })
  .strip();

export type RfidTagsQuery = z.infer<typeof rfidTagsQuerySchema>;
