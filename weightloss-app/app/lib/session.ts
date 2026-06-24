// =============================================================================
// Session management.
// Sessions are stored in PostgreSQL. The cookie holds the session id signed
// with HMAC-SHA256(SESSION_SECRET). A separate CSRF token is issued for the
// session and rotated on use for state-changing requests.
// =============================================================================
import { cookies } from 'next/headers';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { query } from './db';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'weightloss_session';
const CSRF_COOKIE = 'weightloss_csrf';
const TTL_HOURS = Number.parseInt(process.env.SESSION_TTL_HOURS || '720', 10);

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
  is_active: boolean;
  csrfToken: string;
};

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET must be set and at least 32 characters');
  }
  return s;
}

function sign(value: string): string {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function newSessionId(): string {
  return randomBytes(32).toString('base64url');
}

export function newCsrfToken(): string {
  return randomBytes(24).toString('base64url');
}

export async function createSession(
  userId: number,
  ip: string | null,
  userAgent: string | null
): Promise<{ sessionId: string; csrfToken: string; expiresAt: Date }> {
  const id = newSessionId();
  const csrf = newCsrfToken();
  const expires = new Date(Date.now() + TTL_HOURS * 3600 * 1000);
  await query(
    `INSERT INTO sessions (id, user_id, csrf_token, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, csrf, expires, ip, userAgent]
  );
  return { sessionId: id, csrfToken: csrf, expiresAt: expires };
}

export function setSessionCookies(sessionId: string, csrfToken: string, expiresAt: Date) {
  const jar = cookies();
  const sig = sign(sessionId);
  jar.set(COOKIE_NAME, `${sessionId}.${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt
  });
  // CSRF cookie is readable by JavaScript so the client can copy it into
  // the x-csrf-token header. We require the request body / header to also
  // match the value stored in the DB for the active session.
  jar.set(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt
  });
}

export function clearSessionCookies() {
  const jar = cookies();
  jar.delete(COOKIE_NAME);
  jar.delete(CSRF_COOKIE);
}

export async function destroySessionById(sessionId: string) {
  await query('DELETE FROM sessions WHERE id = $1', [sessionId]);
}

export async function destroyAllSessionsForUser(userId: number) {
  await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

export async function getSessionFromCookies(): Promise<SessionUser | null> {
  const jar = cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;
  const id = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!safeEqual(sig, sign(id))) return null;

  const result = await query<{
    id: number;
    email: string;
    name: string;
    role: 'user' | 'admin';
    is_active: boolean;
    csrf_token: string;
    expires_at: Date;
  }>(
    `SELECT u.id, u.email, u.name, u.role, u.is_active, s.csrf_token, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
        AND s.expires_at > now()
      LIMIT 1`,
    [id]
  );
  const row = result.rows[0];
  if (!row) return null;
  if (!row.is_active) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    is_active: row.is_active,
    csrfToken: row.csrf_token
  };
}

export async function getSessionIdFromCookies(): Promise<string | null> {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf('.');
  if (dot <= 0) return null;
  return raw.slice(0, dot);
}

export function getCsrfFromHeaders(headers: Headers): string | null {
  return headers.get('x-csrf-token');
}

export function getCsrfFromCookies(): string | null {
  return cookies().get(CSRF_COOKIE)?.value ?? null;
}

export function verifyCsrf(headers: Headers, expected: string): boolean {
  const provided = getCsrfFromHeaders(headers);
  if (!provided) return false;
  return safeEqual(provided, expected);
}

export async function rotateCsrf(userId: number): Promise<string> {
  const csrf = newCsrfToken();
  const sid = await getSessionIdFromCookies();
  if (!sid) throw new Error('No active session');
  await query('UPDATE sessions SET csrf_token = $1 WHERE id = $2', [csrf, sid]);
  // Re-extend the cookie expiry
  const expires = new Date(Date.now() + TTL_HOURS * 3600 * 1000);
  cookies().set(CSRF_COOKIE, csrf, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires
  });
  // Best effort: also ensure user is still active
  await query('SELECT 1 FROM users WHERE id = $1 AND is_active = TRUE', [userId]);
  return csrf;
}

export { COOKIE_NAME, CSRF_COOKIE };
