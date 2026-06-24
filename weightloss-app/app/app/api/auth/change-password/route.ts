import { NextRequest } from 'next/server';
import { json, err, validated } from '@/lib/api';
import { changePasswordSchema } from '@/lib/validation';
import { query } from '@/lib/db';
import { hashPassword, verifyPassword, validatePasswordStrength } from '@/lib/password';
import { audit } from '@/lib/audit';
import { getClientIp, requireUser, requireCsrf } from '@/lib/auth';
import { destroyAllSessionsForUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const csrf = await requireCsrf(request, auth.user);
  if (csrf) return csrf;

  const parsed = await validated(request, changePasswordSchema);
  if (!parsed.ok) return parsed.response;

  const strength = validatePasswordStrength(parsed.data.new_password);
  if (!strength.ok) return err(strength.reason || 'Weak password', 400);

  const r = await query<{ password_hash: string }>(
    'SELECT password_hash FROM users WHERE id = $1', [auth.user.id]
  );
  const ok = await verifyPassword(parsed.data.current_password, r.rows[0]?.password_hash ?? '');
  if (!ok) return err('Current password is incorrect', 400);

  const newHash = await hashPassword(parsed.data.new_password);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, auth.user.id]);

  // Invalidate all other sessions for safety
  await destroyAllSessionsForUser(auth.user.id);

  await audit({ userId: auth.user.id, action: 'password_changed',
    targetType: 'user', targetId: auth.user.id, ip: await getClientIp(request) });

  return json({ ok: true });
}
