import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { HttpStatus } from '../shared/httpStatus.js';

/** Response headers that keep browsers from sniffing, framing or leaking referrers of the app's pages and API. */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups', // Google sign-in opens a popup
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  if (process.env.NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

/**
 * A fixed-window limiter per client address, kept in memory. It slows down guessing of personal link tokens
 * and flooding of the public answer endpoints; a deployment with several instances needs a shared store instead.
 */
export function rateLimit(limit: number, windowMs: number): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
    const key = req.ip ?? 'unknown';
    const entry = hits.get(key) ?? { count: 0, resetAt: now + windowMs };
    entry.count += 1;
    hits.set(key, entry);
    if (entry.count > limit) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({ error: 'too many requests, please try again later' });
      return;
    }
    next();
  };
}
