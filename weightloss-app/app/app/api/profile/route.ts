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
    `SELECT id, email, name, role, is_active, sex, age,
            height_cm::text AS height_cm, activity_level,
            target_weight_kg::text AS target_weight_kg,
            target_calorie_deficit,
            to_char(target_date, 'YYYY-MM-DD') AS target_date,
            calorie_target, protein_target_g, carbs_target_g, fat_target_g,
            water_target_ml,
            photo_storage_used_bytes,
            created_at, updated_at
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
  const str = (v: unknown, max: number): string | null => {
    if (v === null || v === '' || v === undefined) return null;
    if (typeof v !== 'string') return null;
    return v.slice(0, max);
  };

  const name     = str(b.name, 120);
  const sex      = str(b.sex, 16);
  const activity = str(b.activity_level, 32);
  const age            = num(b.age);
  const height_cm      = num(b.height_cm);
  const target_weight  = num(b.target_weight_kg);

  if (name !== null && name.length < 1) return err('Name cannot be empty', 400);
  if (sex !== null && !['male','female','other',''].includes(sex)) return err('Invalid sex', 400);
  if (activity !== null && !['','sedentary','light','moderate','active','very_active'].includes(activity)) return err('Invalid activity level', 400);
  if (age !== null && (age < 0 || age > 130)) return err('Invalid age', 400);
  if (height_cm !== null && (height_cm <= 0 || height_cm > 300)) return err('Invalid height', 400);
  if (target_weight !== null && (target_weight <= 0 || target_weight > 500)) return err('Invalid target weight', 400);

  // Build dynamic SET
  const sets: string[] = [];
  const params: unknown[] = [];
  const add = (col: string, val: unknown) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  if (name !== null) add('name', name);
  if (sex !== null) add('sex', sex === '' ? null : sex);
  if (activity !== null) add('activity_level', activity === '' ? null : activity);
  if (age !== null) add('age', age);
  if (height_cm !== null) add('height_cm', height_cm);
  if (target_weight !== null) add('target_weight_kg', target_weight);
  if (sets.length === 0) return json({ ok: true, updated: 0 });

  params.push(auth.user.id);
  await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  await audit({ userId: auth.user.id, action: 'profile_update',
    targetType: 'user', targetId: auth.user.id, ip: await getClientIp(request) });
  return json({ ok: true });
}
