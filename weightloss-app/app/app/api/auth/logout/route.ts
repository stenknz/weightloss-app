import { NextRequest } from 'next/server';
import { json } from '@/lib/api';
import { destroySessionById, clearSessionCookies, getSessionIdFromCookies } from '@/lib/session';
import { audit } from '@/lib/audit';
import { getCurrentUser, getClientIp } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const sid = await getSessionIdFromCookies();
  if (sid) await destroySessionById(sid);
  clearSessionCookies();
  if (user) {
    await audit({ userId: user.id, action: 'logout',
      targetType: 'user', targetId: user.id, ip: await getClientIp(request) });
  }
  return json({ ok: true });
}
