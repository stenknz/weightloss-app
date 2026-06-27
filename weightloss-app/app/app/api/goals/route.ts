import { NextRequest } from 'next/server';
import { json, err } from '@/lib/api';
import { query } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getClientIp, requireUser, requireCsrf } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const r = await query(
    `SELECT target_weight_kg::text AS target_weight_kg,
            target_calorie_deficit,
            to_char(target_date, 'YYYY-MM-DD') AS target_date,
            calorie_target, protein_target_g, carbs_target_g, fat_target_g,
            water_target_ml
       FROM users WHERE id = $1`,
    [auth.user.id]
  );
  return json(r.rows[0] || {});
}

export async function PUT(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const csrf = await requireCsrf(request, auth.user);
  if (csrf) return csrf;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return err('Invalid body', 400);
  const b = body as Record<string, unknown>;

  const num = (v: unknown): number | null => {
    if (v === null || v === '' || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: unknown): string | null => {
    if (v === null || v === '' || v === undefined) return null;
    if (typeof v !== 'string') return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    return v;
  };

  const target_weight_kg       = num(b.target_weight_kg);
  const target_calorie_deficit = num(b.target_calorie_deficit);
  const target_date            = str(b.target_date);
  const calorie_target         = num(b.calorie_target);
  const protein_target_g       = num(b.protein_target_g);
  const carbs_target_g         = num(b.carbs_target_g);
  const fat_target_g           = num(b.fat_target_g);
  const water_target_ml        = num(b.water_target_ml);

  if (target_weight_kg != null && (target_weight_kg <= 0 || target_weight_kg > 500)) return err('Invalid target weight', 400);
  if (target_calorie_deficit != null && (target_calorie_deficit < 0 || target_calorie_deficit > 5000)) return err('Invalid deficit', 400);
  if (calorie_target != null && (calorie_target < 0 || calorie_target > 20000)) return err('Invalid calorie target', 400);
  if (water_target_ml != null && (water_target_ml < 500 || water_target_ml > 15000)) return err('Invalid water target', 400);

  await query(
    `UPDATE users SET
       target_weight_kg       = $1,
       target_calorie_deficit = $2,
       target_date            = $3,
       calorie_target         = $4,
       protein_target_g       = $5,
       carbs_target_g         = $6,
       fat_target_g           = $7,
       water_target_ml        = $8
     WHERE id = $9`,
    [
      target_weight_kg,
      target_calorie_deficit,
      target_date,
      calorie_target,
      protein_target_g,
      carbs_target_g,
      fat_target_g,
      water_target_ml,
      auth.user.id
    ]
  );
  await audit({ userId: auth.user.id, action: 'targets_update',
    targetType: 'user', targetId: auth.user.id, ip: await getClientIp(request),
    details: b });
  return json({ ok: true });
}
