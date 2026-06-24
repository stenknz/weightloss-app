import { NextRequest } from 'next/server';
import { json, err, validated } from '@/lib/api';
import { createInviteSchema } from '@/lib/validation';
import { query } from '@/lib/db';
import { audit } from '@/lib/audit';
import { requireAdmin, getClientIp } from '@/lib/auth';
import { requireCsrf } from '@/lib/auth';
import { makeInviteCode } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;
  const r = await query(
    `SELECT i.id, i.code, i.email, i.note, i.max_uses, i.uses,
            i.expires_at, i.created_at,
            u.email AS created_by_email, u.name AS created_by_name,
            ub.email AS used_by_email
       FROM invites i
       JOIN users u ON u.id = i.created_by
       LEFT JOIN users ub ON ub.id = i.used_by
       ORDER BY i.created_at DESC`
  );
  return json({ items: r.rows });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;
  const csrf = await requireCsrf(request, auth.user);
  if (csrf) return csrf;
  const parsed = await validated(request, createInviteSchema);
  if (!parsed.ok) return parsed.response;

  const code = makeInviteCode();
  const expires = parsed.data.expires_in_days
    ? new Date(Date.now() + parsed.data.expires_in_days * 86400_000)
    : null;
  const r = await query<{ id: number }>(
    `INSERT INTO invites (code, created_by, email, note, max_uses, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      code,
      auth.user.id,
      parsed.data.email ?? null,
      parsed.data.note ?? null,
      parsed.data.max_uses ?? 1,
      expires
    ]
  );
  await audit({ userId: auth.user.id, action: 'invite_create',
    targetType: 'invite', targetId: r.rows[0].id,
    ip: await getClientIp(request), details: { code } });
  return json({ id: r.rows[0].id, code });
}
