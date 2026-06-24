import { NextRequest } from 'next/server';
import { json, err, validated } from '@/lib/api';
import { weighInSchema } from '@/lib/validation';
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
  const limit = Math.min(Number.parseInt(url.searchParams.get('limit') || '365', 10), 5000);

  const params: unknown[] = [auth.user.id];
  let where = 'user_id = $1';
  if (from) { params.push(from); where += ` AND entry_date >= $${params.length}`; }
  if (to)   { params.push(to);   where += ` AND entry_date <= $${params.length}`; }
  params.push(limit);
  const r = await query<{
    id: number;
    entry_date: string;
    weight_kg: string;
    note: string | null;
    created_at: Date;
  }>(
    `SELECT id, entry_date::text AS entry_date, weight_kg::text AS weight_kg, note, created_at
       FROM weigh_ins
      WHERE ${where}
      ORDER BY entry_date DESC
      LIMIT $${params.length}`,
    params
  );
  return json({ items: r.rows });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const csrf = await requireCsrf(request, auth.user);
  if (csrf) return csrf;

  const parsed = await validated(request, weighInSchema);
  if (!parsed.ok) return parsed.response;

  const date = parsed.data.entry_date || todayISO();
  const r = await query<{ id: number }>(
    `INSERT INTO weigh_ins (user_id, entry_date, weight_kg, note)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, entry_date) DO UPDATE
       SET weight_kg = EXCLUDED.weight_kg, note = EXCLUDED.note
     RETURNING id`,
    [auth.user.id, date, parsed.data.weight_kg, parsed.data.note ?? null]
  );
  await audit({ userId: auth.user.id, action: 'weigh_in_upsert',
    targetType: 'weigh_in', targetId: r.rows[0].id, ip: await getClientIp(request),
    details: { date, weight_kg: parsed.data.weight_kg } });
  return json({ id: r.rows[0].id, entry_date: date });
}
