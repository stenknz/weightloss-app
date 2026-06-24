import { NextRequest } from 'next/server';
import { json, err, validated } from '@/lib/api';
import { loginSchema } from '@/lib/validation';
import { query, withTransaction } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { createSession, setSessionCookies } from '@/lib/session';
import { audit } from '@/lib/audit';
import { getClientIp } from '@/lib/auth';
import { checkRateLimit, loginKey, resetRateLimit } from '@/lib/ratelimit';
import { loginRateLimitPerHour } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const parsed = await validated(request, loginSchema);
  if (!parsed.ok) return parsed.response;

  const ip = await getClientIp(request);
  const rateKey = loginKey(ip, parsed.data.email);
  const rate = await checkRateLimit(rateKey, loginRateLimitPerHour(), 3600);
  if (!rate.allowed) {
    return err('Too many login attempts. Please wait and try again later.', 429, {
      retry_after_seconds: Math.ceil((rate.resetAt.getTime() - Date.now()) / 1000)
    });
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

  // Always run verify to avoid trivial timing oracles, even if user is missing.
  const dummy = '$2a$12$ZHVtbXlkdW1teWR1bW15ZHVtbXlkdW1teWR1bW15ZHVtbXk';
  const ok = user
    ? await verifyPassword(parsed.data.password, user.password_hash)
    : (await verifyPassword(parsed.data.password, dummy), false);

  if (!user || !ok) {
    await audit({ userId: user?.id ?? null, action: 'login_failed',
      targetType: 'user', targetId: user?.id ?? null, ip,
      details: { email: parsed.data.email } });
    return err('Invalid email or password', 401);
  }
  if (!user.is_active) {
    return err('Account disabled', 403);
  }

  await resetRateLimit(rateKey);

  const ua = request.headers.get('user-agent');
  const { sessionId, csrfToken, expiresAt } = await withTransaction(async (client) => {
    const r = await createSession(user.id, ip, ua);
    return r;
  });
  setSessionCookies(sessionId, csrfToken, expiresAt);

  await audit({ userId: user.id, action: 'login_success',
    targetType: 'user', targetId: user.id, ip });

  return json({
    user: {
      id: user.id, email: user.email, name: user.name, role: user.role
    }
  });
}
