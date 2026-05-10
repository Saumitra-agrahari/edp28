import { Device, User } from '@prisma/client';

// Extend Express Request with authenticated user + device
// Per Architecture.md §7: auth.middleware populates req.user, device-owner.middleware populates req.device

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      device?: Device;
    }
  }
}

export interface AuthUser {
  id: string;
  email: string;
  deviceId: string | null;
  fullName: string;
}

export type { User, Device };
