import { NextRequest } from 'next/server';
import { json, err } from '@/lib/api';
import { query } from '@/lib/db';
import { audit } from '@/lib/audit';
import { requireAdmin, getClientIp, requireCsrf } from '@/lib/auth';
import { hashPassword, validatePasswordStrength } from '@/lib/password';
import { destroyAllSessionsForUser } from '@/lib/session';
import { deleteUserDir } from '@/lib/uploads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, ctx: { params: { id: string } }) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;
  const csrf = await requireCsrf(request, auth.user);
  if (csrf) return csrf;
  const id = Number.parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) return err('Invalid id', 400);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return err('Invalid body', 400);
  const b = body as Record<string, unknown>;

  // Validate fields
  if (b.name !== undefined && (typeof b.name !== 'string' || b.name.length === 0 || b.name.length > 120)) {
    return err('Invalid name', 400);
  }
  if (b.email !== undefined && (typeof b.email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email))) {
    return err('Invalid email', 400);
  }
  if (b.role !== undefined && b.role !== 'user' && b.role !== 'admin') {
    return err('Invalid role', 400);
  }
  if (b.is_active !== undefined && typeof b.is_active !== 'boolean') {
    return err('Invalid is_active', 400);
  }
  if (b.password !== undefined) {
    if (typeof b.password !== 'string') return err('Invalid password', 400);
    const v = validatePasswordStrength(b.password);
    if (!v.ok) return err(v.reason || 'Weak password', 400);
  }

  // Don't let the last admin demote/disable themselves
  if (id === auth.user.id && (b.role === 'user' || b.is_active === false)) {
    return err('You cannot demote or disable your own admin account', 400);
  }

  // Build dynamic SET
  const sets: string[] = [];
  const params: unknown[] = [];
  const add = (col: string, val: unknown) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  if (b.name !== undefined)     add('name', String(b.name).slice(0, 120));
  if (b.email !== undefined)   add('email', String(b.email).toLowerCase());
  if (b.role !== undefined)    add('role', b.role);
  if (b.is_active !== undefined) add('is_active', b.is_active);
  if (b.password !== undefined) {
    const hash = await hashPassword(String(b.password));
    add('password_hash', hash);
  }
  if (sets.length === 0) return json({ ok: true, updated: 0 });
  params.push(id);
  const r = await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  if (r.rowCount === 0) return err('Not found', 404);

  if (b.password !== undefined) {
    await destroyAllSessionsForUser(id);
  }
  if (b.is_active === false) {
    await destroyAllSessionsForUser(id);
  }

  await audit({ userId: auth.user.id, action: 'user_update',
    targetType: 'user', targetId: id, ip: await getClientIp(request),
    details: Object.keys(b) });
  return json({ ok: true });
}

export async function DELETE(request: NextRequest, ctx: { params: { id: string } }) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;
  const csrf = await requireCsrf(request, auth.user);
  if (csrf) return csrf;
  const id = Number.parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) return err('Invalid id', 400);
  if (id === auth.user.id) return err('You cannot delete your own account', 400);

  // ON DELETE CASCADE will remove all user data
  const r = await query('DELETE FROM users WHERE id = $1', [id]);
  if (r.rowCount === 0) return err('Not found', 404);
  try {
    await deleteUserDir(id);
  } catch (e) {
    console.warn('user dir delete failed', e);
  }
  await audit({ userId: auth.user.id, action: 'user_delete',
    targetType: 'user', targetId: id, ip: await getClientIp(request) });
  return json({ ok: true });
}
