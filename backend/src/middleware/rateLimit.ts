import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

/**
 * Simple in-memory fixed-window rate limiter, keyed by client IP.
 * Fine for a single backend instance; use a shared store (e.g. Redis)
 * if you run several instances.
 */
export const rateLimit = ({ windowMs, max }: RateLimitOptions) => {
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Periodically drop expired entries so the map doesn't grow forever
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, windowMs).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count++;

    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      throw new ApiError(429, 'Too many requests. Please wait a moment and try again.');
    }

    next();
  };
};
