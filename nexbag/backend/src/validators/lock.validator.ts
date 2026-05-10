import { z } from 'zod';

// ─── POST /v1/lock/command ────────────────────────────────────────────────────
// Per Security.md §12: idempotency_key required (UUID v4)
export const lockCommandSchema = z
  .object({
    action: z.enum(['LOCK', 'UNLOCK'], { errorMap: () => ({ message: "action must be 'LOCK' or 'UNLOCK'." }) }),
    idempotency_key: z
      .string()
      .uuid('idempotency_key must be a valid UUID v4.')
      .min(1, 'idempotency_key is required.'),
  })
  .strip();

export type LockCommandInput = z.infer<typeof lockCommandSchema>;

// ─── GET /v1/lock/history (query params) ─────────────────────────────────────
export const lockHistoryQuerySchema = z
  .object({
    limit: z.string().optional().default('20').transform(Number).pipe(z.number().min(1).max(50)),
  })
  .strip();

export type LockHistoryQuery = z.infer<typeof lockHistoryQuerySchema>;
