import crypto from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { HttpStatus } from '../shared/httpStatus.js';
import type { User } from '../shared/types.js';
import { createSession, deleteSession, getSessionUser, upsertGoogleUser } from './db.js';

const SESSION_COOKIE = 'sid';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
if (!googleClientId) {
  console.warn('GOOGLE_CLIENT_ID is not set; Google login will not work.');
}
const googleClient = new OAuth2Client(googleClientId);

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

// Only a hash of the session token is stored, so a leaked database cannot be used to hijack sessions.
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const;

export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string') {
    req.user = await getSessionUser(hashToken(token));
  }
  next();
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(HttpStatus.UNAUTHORIZED).json({ error: 'not signed in' });
    return;
  }
  next();
}

export const authRouter = Router();

authRouter.get('/config', (_req, res) => {
  res.json({ googleClientId: googleClientId ?? null });
});

authRouter.get('/me', (req, res) => {
  res.json(req.user ?? null);
});

authRouter.post('/google', async (req, res) => {
  const credential = req.body?.credential;
  if (!googleClientId) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Google login is not configured' });
    return;
  }
  if (typeof credential !== 'string') {
    res.status(HttpStatus.BAD_REQUEST).json({ error: 'credential is required' });
    return;
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: googleClientId });
    payload = ticket.getPayload();
  } catch {
    res.status(HttpStatus.UNAUTHORIZED).json({ error: 'invalid Google credential' });
    return;
  }
  if (!payload?.sub || !payload.email || !payload.email_verified) {
    res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Google account email is not verified' });
    return;
  }

  const user = await upsertGoogleUser(payload.sub, payload.email, payload.name ?? payload.email, payload.picture ?? null);
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await createSession(hashToken(token), user.id, expiresAt);

  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, expires: expiresAt });
  res.json(user);
});

authRouter.post('/logout', async (req, res) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string') {
    await deleteSession(hashToken(token));
  }
  res.clearCookie(SESSION_COOKIE, cookieOptions);
  res.status(HttpStatus.NO_CONTENT).end();
});
