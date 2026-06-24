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
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return err('Invalid body', 400);
  const b = body as Record<string, unknown>;

  const num = (v: unknown): number | null => {
    if (v === null || v === '' || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const calorie_target   = num(b.calorie_target);
  const protein_target_g = num(b.protein_target_g);
  const carbs_target_g   = num(b.carbs_target_g);
  const fat_target_g     = num(b.fat_target_g);

  if (calorie_target   != null && (calorie_target   < 0 || calorie_target   > 20000)) return err('Invalid calorie target', 400);
  if (protein_target_g != null && (protein_target_g < 0 || protein_target_g > 1000))  return err('Invalid protein target', 400);
  if (carbs_target_g   != null && (carbs_target_g   < 0 || carbs_target_g   > 2000))  return err('Invalid carbs target', 400);
  if (fat_target_g     != null && (fat_target_g     < 0 || fat_target_g     > 500))   return err('Invalid fat target', 400);

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
