import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, err, validated } from '@/lib/api';
import { query } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getClientIp, requireUser, requireCsrf } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, ctx: { params: { id: string } }) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const id = Number.parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) return err('Invalid id', 400);
  const r = await query(
    `SELECT id, entry_date::text AS entry_date, weight_kg::text AS weight_kg, note, created_at
       FROM weigh_ins WHERE id = $1 AND user_id = $2`,
    [id, auth.user.id]
  );
  if (r.rowCount === 0) return err('Not found', 404);
  return json(r.rows[0]);
}

export async function PUT(request: NextRequest, ctx: { params: { id: string } }) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const csrf = await requireCsrf(request, auth.user);
  if (csrf) return csrf;
  const id = Number.parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) return err('Invalid id', 400);
  const body = await validated(request, z.object({
    weight_kg: z.number().positive(),
    note: z.string().max(1000).nullable().optional(),
  }));
  if (!body.ok) return body.response;
  const { weight_kg, note } = body.data;
  const r = await query(
    `UPDATE weigh_ins
        SET weight_kg = $1, note = $2
      WHERE id = $3 AND user_id = $4`,
    [weight_kg, typeof note === 'string' ? note.slice(0, 1000) : null, id, auth.user.id]
  );
  if (r.rowCount === 0) return err('Not found', 404);
  await audit({ userId: auth.user.id, action: 'weigh_in_update',
    targetType: 'weigh_in', targetId: id, ip: await getClientIp(request),
    details: { weight_kg } });
  return json({ ok: true });
}

export async function DELETE(request: NextRequest, ctx: { params: { id: string } }) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const csrf = await requireCsrf(request, auth.user);
  if (csrf) return csrf;
  const id = Number.parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) return err('Invalid id', 400);
  const r = await query(
    'DELETE FROM weigh_ins WHERE id = $1 AND user_id = $2',
    [id, auth.user.id]
  );
  if (r.rowCount === 0) return err('Not found', 404);
  await audit({ userId: auth.user.id, action: 'weigh_in_delete',
    targetType: 'weigh_in', targetId: id, ip: await getClientIp(request) });
  return json({ ok: true });
}
