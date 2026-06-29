'use server';

import { query, withTransaction } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { loginSchema, registerSchema, changePasswordSchema } from '@/lib/validation';
import { createSession, createSessionInTransaction, setSessionCookies, clearSessionCookies, destroySessionById, destroyAllSessionsForUser, getSessionIdFromCookies } from '@/lib/session';
import { audit } from '@/lib/audit';
import { hashPassword, verifyPassword, validatePasswordStrength } from '@/lib/password';
import { checkRateLimit, loginKey, ipKey, resetRateLimit } from '@/lib/ratelimit';
import { loginRateLimitPerHour } from '@/lib/constants';
import { getBoolSetting } from '@/lib/settings';
import { z } from 'zod';
import { headers } from 'next/headers';

export async function login(
  data: { email: string; password: string }
): Promise<{ error: string; retry_after_seconds?: number } | { user: { id: number; email: string; name: string; role: string } }> {
  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) return { error: 'Validation failed' };

  const h = headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ua = h.get('user-agent') ?? null;
  const rateKey = loginKey(ip, parsed.data.email);
  const rate = await checkRateLimit(rateKey, loginRateLimitPerHour(), 3600);
  if (!rate.allowed) {
    return { error: 'Too many login attempts. Please wait and try again later.', retry_after_seconds: Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000) };
  }

  const userRes = await query<{
    id: number; email: string; name: string; role: 'user' | 'admin';
    is_active: boolean; password_hash: string;
  }>(
    `SELECT id, email, name, role, is_active, password_hash
       FROM users WHERE email = $1 LIMIT 1`,
    [parsed.data.email]
  );
  const user = userRes.rows[0];

  const dummy = '$2a$12$ZHVtbXlkdW1teWR1bW15ZHVtbXlkdW1teWR1bW15ZHVtbXk';
  const ok = user
    ? await verifyPassword(parsed.data.password, user.password_hash)
    : (await verifyPassword(parsed.data.password, dummy), false);

  if (!user || !ok) {
    await audit({ userId: user?.id ?? null, action: 'login_failed',
      targetType: 'user', targetId: user?.id ?? null, ip,
      details: { email: parsed.data.email } });
    return { error: 'Invalid email or password' };
  }
  if (!user.is_active) return { error: 'Account disabled' };

  await resetRateLimit(rateKey);

  const { sessionId, csrfToken, expiresAt } = await createSession(user.id, ip, ua);
  setSessionCookies(sessionId, csrfToken, expiresAt);

  await audit({ userId: user.id, action: 'login_success',
    targetType: 'user', targetId: user.id, ip });

  return {
    user: {
      id: user.id, email: user.email, name: user.name, role: user.role
    }
  };
}

export async function register(
  data: { email: string; password: string; name: string; invite_code: string }
): Promise<{ error: string } | { user: { id: number; email: string; name: string; role: string } }> {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) return { error: 'Validation failed' };

  const h = headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ua = h.get('user-agent') ?? null;
  const rate = await checkRateLimit(ipKey(ip, 'register'), 10, 3600);
  if (!rate.allowed) return { error: 'Too many registration attempts. Try again later.' };

  const inviteOnly = await getBoolSetting('invite_only', true);
  if (inviteOnly) {
    const code = parsed.data.invite_code.toUpperCase();
    const inv = await query<{
      id: number; max_uses: number; uses: number; expires_at: Date | null;
    }>(
      `SELECT id, max_uses, uses, expires_at FROM invites WHERE code = $1 LIMIT 1`,
      [code]
    );
    const invite = inv.rows[0];
    if (!invite) return { error: 'Invalid invite code' };
    if (invite.expires_at && invite.expires_at < new Date()) return { error: 'Invite code has expired' };
    if (invite.uses >= invite.max_uses) return { error: 'Invite code has already been used' };
  }

  const pw = validatePasswordStrength(parsed.data.password);
  if (!pw.ok) return { error: pw.reason || 'Weak password' };

  const exists = await query('SELECT 1 FROM users WHERE email = $1', [parsed.data.email]);
  if (exists.rowCount && exists.rowCount > 0) return { error: 'An account with that email already exists' };

  const passwordHash = await hashPassword(parsed.data.password);

  const { user, sessionId, csrfToken, expiresAt } = await withTransaction(async (client) => {
    const u = await client.query<{ id: number; email: string; name: string; role: 'user'|'admin' }>(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, email, name, role`,
      [parsed.data.email, passwordHash, parsed.data.name]
    );
    if (inviteOnly) {
      await client.query(
        `UPDATE invites
            SET uses = uses + 1, used_by = COALESCE(used_by, $1)
          WHERE code = $2`,
        [u.rows[0].id, parsed.data.invite_code.toUpperCase()]
      );
    }
    const sid = await createSessionInTransaction(client, u.rows[0].id, ip, ua);
    return { user: u.rows[0], ...sid };
  });

  setSessionCookies(sessionId, csrfToken, expiresAt);

  await audit({ userId: user.id, action: 'user_registered',
    targetType: 'user', targetId: user.id, ip });

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  };
}

export async function logout() {
  const user = await getCurrentUser();
  const sid = await getSessionIdFromCookies();
  if (sid) await destroySessionById(sid);
  clearSessionCookies();
  if (user) {
    const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    await audit({ userId: user.id, action: 'logout',
      targetType: 'user', targetId: user.id, ip });
  }
  return { ok: true };
}

export async function changePassword(data: { current_password: string; new_password: string }) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const parsed = changePasswordSchema.safeParse(data);
  if (!parsed.success) return { error: 'Validation failed' };

  const strength = validatePasswordStrength(parsed.data.new_password);
  if (!strength.ok) return { error: strength.reason || 'Weak password' };

  const r = await query<{ password_hash: string }>(
    'SELECT password_hash FROM users WHERE id = $1', [user.id]
  );
  const ok = await verifyPassword(parsed.data.current_password, r.rows[0]?.password_hash ?? '');
  if (!ok) return { error: 'Current password is incorrect' };

  const newHash = await hashPassword(parsed.data.new_password);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);

  await destroyAllSessionsForUser(user.id);

  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  await audit({ userId: user.id, action: 'password_changed',
    targetType: 'user', targetId: user.id, ip });

  return { ok: true };
}
