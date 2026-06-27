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
    `SELECT calorie_target, protein_target_g, carbs_target_g, fat_target_g
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
    calorie_target: z.number().min(0).max(20000).nullable().optional(),
    protein_target_g: z.number().min(0).max(1000).nullable().optional(),
    carbs_target_g: z.number().min(0).max(2000).nullable().optional(),
    fat_target_g: z.number().min(0).max(500).nullable().optional(),
  }));
  if (!body.ok) return body.response;
  const {
    calorie_target,
    protein_target_g,
    carbs_target_g,
    fat_target_g,
  } = body.data;

  await query(
    `UPDATE users SET
       calorie_target   = $1,
       protein_target_g = $2,
       carbs_target_g   = $3,
       fat_target_g     = $4
     WHERE id = $5`,
    [calorie_target, protein_target_g, carbs_target_g, fat_target_g, auth.user.id]
  );
  await audit({ userId: auth.user.id, action: 'macro_targets_update',
    targetType: 'user', targetId: auth.user.id, ip: await getClientIp(request) });
  return json({ ok: true });
}
