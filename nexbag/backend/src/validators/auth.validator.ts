import { z } from 'zod';

// ─── Password policy (Security.md §4) ─────────────────────────────────────────
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one digit.')
  .regex(/[!@#$%^&*()_+\-=]/, 'Password must contain at least one special character (!@#$%^&*()_+-=).');

// ─── POST /v1/auth/register ────────────────────────────────────────────────────
export const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Name must be at least 2 characters.').max(100),
    email: z.string().email('Invalid email format.').transform((e) => e.toLowerCase().trim()),
    password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// ─── POST /v1/auth/login ───────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Invalid email format.').transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required.'),
  remember_me: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── POST /v1/auth/token/refresh ──────────────────────────────────────────────
export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required.'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// ─── POST /v1/auth/logout ─────────────────────────────────────────────────────
export const logoutSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required.'),
});

export type LogoutInput = z.infer<typeof logoutSchema>;

// ─── POST /v1/auth/password/forgot ────────────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format.').transform((e) => e.toLowerCase().trim()),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ─── POST /v1/auth/password/verify-otp ───────────────────────────────────────
export const verifyOtpSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  otp: z.string().length(6, 'OTP must be exactly 6 digits.').regex(/^\d{6}$/),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

// ─── POST /v1/auth/password/reset ─────────────────────────────────────────────
export const resetPasswordSchema = z
  .object({
    reset_token: z.string().min(1, 'Reset token is required.'),
    new_password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ─── POST /v1/users/me/password ───────────────────────────────────────────────
export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required.'),
    new_password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
