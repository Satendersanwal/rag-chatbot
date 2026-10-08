import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { ApiError } from './errorHandler';

/**
 * Protect admin-only endpoints (e.g. document ingestion) with ADMIN_API_KEY.
 * Clients send it as `Authorization: Bearer <key>` or `x-api-key: <key>`.
 * If ADMIN_API_KEY is not set, protected endpoints are disabled entirely.
 */
export const requireAdminKey = (req: Request, _res: Response, next: NextFunction) => {
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    throw new ApiError(403, 'This endpoint is disabled. Set ADMIN_API_KEY on the server to enable it.');
  }

  const authHeader = req.get('authorization');
  const providedKey = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : req.get('x-api-key');

  if (!providedKey || !safeEqual(providedKey, adminKey)) {
    throw new ApiError(401, 'Invalid or missing API key');
  }

  next();
};

/**
 * Constant-time string comparison, so the key can't be guessed via response timing
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
