import { NextRequest } from 'next/server';
import { json, err, validated } from '@/lib/api';
import { registerSchema } from '@/lib/validation';
import { query, withTransaction } from '@/lib/db';
import { hashPassword, validatePasswordStrength } from '@/lib/password';
import { createSession, createSessionInTransaction, setSessionCookies } from '@/lib/session';
import { audit } from '@/lib/audit';
import { getClientIp, getCurrentUser } from '@/lib/auth';
import { getBoolSetting, setSetting } from '@/lib/settings';
import { checkRateLimit, ipKey } from '@/lib/ratelimit';
import { makeInviteCode } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const parsed = await validated(request, registerSchema);
  if (!parsed.ok) return parsed.response;

  const ip = await getClientIp(request);
  const rate = await checkRateLimit(ipKey(ip, 'register'), 10, 3600);
  if (!rate.allowed) {
    return err('Too many registration attempts. Try again later.', 429);
  }

  // Enforce invite-only mode unless an invite was supplied
  const inviteOnly = await getBoolSetting('invite_only', true);
  if (inviteOnly) {
    // Always require an invite code; verify it server-side
    const code = parsed.data.invite_code.toUpperCase();
    const inv = await query<{
      id: number; max_uses: number; uses: number; expires_at: Date | null;
    }>(
      `SELECT id, max_uses, uses, expires_at FROM invites WHERE code = $1 LIMIT 1`,
      [code]
    );
    const invite = inv.rows[0];
    if (!invite) return err('Invalid invite code', 400);
    if (invite.expires_at && invite.expires_at < new Date()) {
      return err('Invite code has expired', 400);
    }
    if (invite.uses >= invite.max_uses) {
      return err('Invite code has already been used', 400);
    }
  }

  // Password strength
  const pw = validatePasswordStrength(parsed.data.password);
  if (!pw.ok) return err(pw.reason || 'Weak password', 400);

  // Email uniqueness
  const exists = await query('SELECT 1 FROM users WHERE email = $1', [parsed.data.email]);
  if (exists.rowCount && exists.rowCount > 0) {
    return err('An account with that email already exists', 409);
  }

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
    const sid = await createSessionInTransaction(client, u.rows[0].id, ip, request.headers.get('user-agent'));
    return { user: u.rows[0], ...sid };
  });

  setSessionCookies(sessionId, csrfToken, expiresAt);

  await audit({ userId: user.id, action: 'user_registered',
    targetType: 'user', targetId: user.id, ip });

  return json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });
}
