import { NextRequest } from 'next/server';
import { json, validated } from '@/lib/api';
import { stepLogSchema } from '@/lib/validation';
import { query } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getClientIp, requireUser, requireCsrf } from '@/lib/auth';
import { todayISO } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const params: unknown[] = [auth.user.id];
  let where = 'user_id = $1';
  if (from) { params.push(from); where += ` AND entry_date >= $${params.length}`; }
  if (to)   { params.push(to);   where += ` AND entry_date <= $${params.length}`; }
  const r = await query(
    `SELECT id, entry_date::text AS entry_date, steps, created_at
       FROM step_logs
      WHERE ${where}
      ORDER BY entry_date DESC
      LIMIT 1000`,
    params
  );
  return json({ items: r.rows });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const csrf = await requireCsrf(request, auth.user);
  if (csrf) return csrf;
  const parsed = await validated(request, stepLogSchema);
  if (!parsed.ok) return parsed.response;

  const date = parsed.data.entry_date || todayISO();
  const r = await query<{ id: number }>(
    `INSERT INTO step_logs (user_id, entry_date, steps)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, entry_date) DO UPDATE
       SET steps = EXCLUDED.steps
     RETURNING id`,
    [auth.user.id, date, parsed.data.steps]
  );
  await audit({ userId: auth.user.id, action: 'step_log_upsert',
    targetType: 'step_log', targetId: r.rows[0].id, ip: await getClientIp(request),
    details: { date, steps: parsed.data.steps } });
  return json({ id: r.rows[0].id });
}
