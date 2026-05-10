import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { AppError } from '../utils/response.utils';
import { prisma } from '../config/prisma';

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing or malformed Authorization header.'));
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);

    // Attach user info to request for downstream handlers
    req.user = {
      id: payload.sub,
      email: payload.email,
      deviceId: payload.device_id,
      fullName: '', // populated lazily if needed
    };

    next();
  } catch (err) {
    next(err);
  }
}

// Optional: load full user from DB (used by routes that need fresh DB data)
export async function loadUser(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', 'Not authenticated.'));

  const user = await prisma.user.findUnique({
    where: { id: req.user.id, deletedAt: null },
    select: { id: true, email: true, deviceId: true, fullName: true },
  });

  if (!user) return next(new AppError(401, 'UNAUTHORIZED', 'User not found.'));

  req.user = {
    id: user.id,
    email: user.email,
    deviceId: user.deviceId,
    fullName: user.fullName,
  };

  next();
}
