import { NextRequest } from 'next/server';
import { json, validated } from '@/lib/api';
import { measurementSchema } from '@/lib/validation';
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
    `SELECT id, entry_date::text AS entry_date,
            waist_cm::text AS waist_cm, chest_cm::text AS chest_cm,
            hips_cm::text  AS hips_cm,  thigh_cm::text AS thigh_cm,
            arm_cm::text   AS arm_cm,   note, created_at
       FROM measurements
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
  const parsed = await validated(request, measurementSchema);
  if (!parsed.ok) return parsed.response;

  const date = parsed.data.entry_date || todayISO();
  const fields = ['waist_cm', 'chest_cm', 'hips_cm', 'thigh_cm', 'arm_cm'] as const;
  const values = fields.map((f) => parsed.data[f] ?? null);

  // Upsert
  const r = await query<{ id: number }>(
    `INSERT INTO measurements (user_id, entry_date, waist_cm, chest_cm, hips_cm, thigh_cm, arm_cm, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, entry_date) DO UPDATE
       SET waist_cm = EXCLUDED.waist_cm,
           chest_cm = EXCLUDED.chest_cm,
           hips_cm  = EXCLUDED.hips_cm,
           thigh_cm = EXCLUDED.thigh_cm,
           arm_cm   = EXCLUDED.arm_cm,
           note     = EXCLUDED.note
     RETURNING id`,
    [auth.user.id, date, ...values, parsed.data.note ?? null]
  );
  await audit({ userId: auth.user.id, action: 'measurements_upsert',
    targetType: 'measurements', targetId: r.rows[0].id,
    ip: await getClientIp(request), details: { date } });
  return json({ id: r.rows[0].id, entry_date: date });
}
