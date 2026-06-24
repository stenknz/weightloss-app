import { NextRequest } from 'next/server';
import { json, validated } from '@/lib/api';
import { dailyNoteSchema } from '@/lib/validation';
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
    `SELECT id, entry_date::text AS entry_date, body, created_at, updated_at
       FROM daily_notes
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
  const parsed = await validated(request, dailyNoteSchema);
  if (!parsed.ok) return parsed.response;

  const date = parsed.data.entry_date || todayISO();
  const r = await query<{ id: number }>(
    `INSERT INTO daily_notes (user_id, entry_date, body)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, entry_date) DO UPDATE
       SET body = EXCLUDED.body
     RETURNING id`,
    [auth.user.id, date, parsed.data.body]
  );
  await audit({ userId: auth.user.id, action: 'daily_note_upsert',
    targetType: 'daily_note', targetId: r.rows[0].id, ip: await getClientIp(request),
    details: { date } });
  return json({ id: r.rows[0].id });
}
