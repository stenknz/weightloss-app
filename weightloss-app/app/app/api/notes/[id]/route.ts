import { NextRequest } from 'next/server';
import { json, err } from '@/lib/api';
import { query } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getClientIp, requireUser, requireCsrf } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest, ctx: { params: { id: string } }) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const csrf = await requireCsrf(request, auth.user);
  if (csrf) return csrf;
  const id = Number.parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) return err('Invalid id', 400);
  const r = await query(
    'DELETE FROM daily_notes WHERE id = $1 AND user_id = $2',
    [id, auth.user.id]
  );
  if (r.rowCount === 0) return err('Not found', 404);
  await audit({ userId: auth.user.id, action: 'daily_note_delete',
    targetType: 'daily_note', targetId: id, ip: await getClientIp(request) });
  return json({ ok: true });
}
