import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, err, validated } from '@/lib/api';
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
  const body = await validated(request, z.object({
    name: z.string().min(1).max(120).nullable().optional(),
    sex: z.enum(['male', 'female', 'other', '']).nullable().optional(),
    activity_level: z.enum(['', 'sedentary', 'light', 'moderate', 'active', 'very_active']).nullable().optional(),
    age: z.number().int().min(0).max(130).nullable().optional(),
    height_cm: z.number().positive().max(300).nullable().optional(),
    target_weight_kg: z.number().positive().max(500).nullable().optional(),
  }));
  if (!body.ok) return body.response;
  const b = body.data;

  const name     = b.name ?? null;
  const sex      = b.sex ?? null;
  const activity = b.activity_level ?? null;
  const age      = b.age ?? null;
  const height_cm      = b.height_cm ?? null;
  const target_weight  = b.target_weight_kg ?? null;

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
