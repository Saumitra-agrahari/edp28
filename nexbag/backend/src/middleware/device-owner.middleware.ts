import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/response.utils';
import { prisma } from '../config/prisma';

// ─── Device ownership middleware ──────────────────────────────────────────────
// Per Architecture.md §7: verifies user has a paired device that they own.
// Attaches req.device for use in controllers.
export async function deviceOwnerMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Not authenticated.'));
  }

  if (!req.user.deviceId) {
    return next(new AppError(403, 'FORBIDDEN', 'No device paired to this account.'));
  }

  const device = await prisma.device.findUnique({
    where: { id: req.user.deviceId },
  });

  if (!device) {
    return next(new AppError(404, 'NOT_FOUND', 'Paired device not found.'));
  }

  if (device.ownerUserId !== req.user.id) {
    return next(new AppError(403, 'FORBIDDEN', 'You do not own this device.'));
  }

  req.device = device;
  next();
}
