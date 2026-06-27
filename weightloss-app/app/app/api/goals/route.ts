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

  const body = await validated(request, z.object({
    target_weight_kg: z.number().positive().max(500).nullable().optional(),
    target_calorie_deficit: z.number().min(0).max(5000).nullable().optional(),
    target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    calorie_target: z.number().min(0).max(20000).nullable().optional(),
    protein_target_g: z.number().min(0).nullable().optional(),
    carbs_target_g: z.number().min(0).nullable().optional(),
    fat_target_g: z.number().min(0).nullable().optional(),
    water_target_ml: z.number().min(500).max(15000).nullable().optional(),
  }));
  if (!body.ok) return body.response;
  const {
    target_weight_kg,
    target_calorie_deficit,
    target_date,
    calorie_target,
    protein_target_g,
    carbs_target_g,
    fat_target_g,
    water_target_ml,
  } = body.data;

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
    details: body.data });
  return json({ ok: true });
}
