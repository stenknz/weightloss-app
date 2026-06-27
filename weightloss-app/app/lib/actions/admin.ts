'use server';

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { hashPassword, validatePasswordStrength } from '@/lib/password';
import { destroyAllSessionsForUser } from '@/lib/session';
import { deleteUserDir } from '@/lib/uploads';
import { makeInviteCode } from '@/lib/utils';
import { createInviteSchema, adminUpdateUserSchema, appSettingsSchema } from '@/lib/validation';
import { getSetting, getBoolSetting, setSetting, invalidateSettingsCache } from '@/lib/settings';
import { APP_NAME } from '@/lib/constants';
import { z } from 'zod';

async function adminGuard() {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };
  if (user.role !== 'admin') return { error: 'Forbidden' };
  return { user };
}

export async function adminListUsers() {
  const guard = await adminGuard();
  if ('error' in guard) return guard;
  const r = await query(
    `SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at,
            (SELECT COUNT(*)::int FROM weigh_ins WHERE user_id = u.id) AS weigh_ins,
            (SELECT COUNT(*)::int FROM food_logs WHERE user_id = u.id) AS food_logs,
            (SELECT COUNT(*)::int FROM photos  WHERE user_id = u.id) AS photos,
            u.photo_storage_used_bytes::int AS photo_storage_used_bytes
       FROM users u
       ORDER BY u.created_at ASC`
  );
  return { data: r.rows };
}

export async function adminUpdateUser(id: number, data: Record<string, unknown>) {
  const guard = await adminGuard();
  if ('error' in guard) return guard;
  const user = guard.user;

  const parsed = adminUpdateUserSchema.safeParse(data);
  if (!parsed.success) return { error: 'Validation failed', issues: parsed.error.issues };

  const b = parsed.data;

  if (id === user.id && (b.role === 'user' || b.is_active === false)) {
    return { error: 'You cannot demote or disable your own admin account' };
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  const add = (col: string, val: unknown) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  if (b.name !== undefined) add('name', b.name);
  if (b.email !== undefined) add('email', b.email.toLowerCase());
  if (b.role !== undefined) add('role', b.role);
  if (b.is_active !== undefined) add('is_active', b.is_active);
  if (b.password !== undefined) {
    const pwCheck = validatePasswordStrength(b.password);
    if (!pwCheck.ok) return { error: pwCheck.reason || 'Weak password' };
    add('password_hash', await hashPassword(b.password));
  }
  if (sets.length === 0) return { ok: true, updated: 0 };
  params.push(id);
  const r = await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  if (r.rowCount === 0) return { error: 'Not found' };

  if (b.password !== undefined) {
    await destroyAllSessionsForUser(id);
  }
  if (b.is_active === false) {
    await destroyAllSessionsForUser(id);
  }

  await audit({ userId: user.id, action: 'user_update',
    targetType: 'user', targetId: id,
    details: Object.keys(b) });
  return { ok: true };
}

export async function adminDeleteUser(id: number) {
  const guard = await adminGuard();
  if ('error' in guard) return guard;
  const user = guard.user;

  if (id === user.id) return { error: 'You cannot delete your own account' };

  const r = await query('DELETE FROM users WHERE id = $1', [id]);
  if (r.rowCount === 0) return { error: 'Not found' };
  try {
    await deleteUserDir(id);
  } catch (e) {
    console.warn('user dir delete failed', e);
  }
  await audit({ userId: user.id, action: 'user_delete',
    targetType: 'user', targetId: id });
  return { ok: true };
}

export async function adminCreateInvite(data: Record<string, unknown>) {
  const guard = await adminGuard();
  if ('error' in guard) return guard;
  const user = guard.user;

  const parsed = createInviteSchema.safeParse(data);
  if (!parsed.success) return { error: 'Validation failed', issues: parsed.error.issues };

  const code = makeInviteCode();
  const expires = parsed.data.expires_in_days
    ? new Date(Date.now() + parsed.data.expires_in_days * 86400_000)
    : null;
  const r = await query<{ id: number }>(
    `INSERT INTO invites (code, created_by, email, note, max_uses, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      code,
      user.id,
      parsed.data.email ?? null,
      parsed.data.note ?? null,
      parsed.data.max_uses ?? 1,
      expires
    ]
  );
  await audit({ userId: user.id, action: 'invite_create',
    targetType: 'invite', targetId: r.rows[0].id,
    details: { code } });
  return { data: { id: r.rows[0].id, code } };
}

export async function adminDeleteInvite(id: number) {
  const guard = await adminGuard();
  if ('error' in guard) return guard;
  const user = guard.user;

  const r = await query('DELETE FROM invites WHERE id = $1', [id]);
  if (r.rowCount === 0) return { error: 'Not found' };
  await audit({ userId: user.id, action: 'invite_delete',
    targetType: 'invite', targetId: id });
  return { ok: true };
}

export async function adminListInvites() {
  const guard = await adminGuard();
  if ('error' in guard) return guard;
  const r = await query(
    `SELECT i.id, i.code, i.email, i.note, i.max_uses, i.uses,
            i.expires_at, i.created_at,
            u.email AS created_by_email, u.name AS created_by_name,
            ub.email AS used_by_email
       FROM invites i
       JOIN users u ON u.id = i.created_by
       LEFT JOIN users ub ON ub.id = i.used_by
       ORDER BY i.created_at DESC`
  );
  return { data: r.rows };
}

export async function adminGetSettings() {
  const guard = await adminGuard();
  if ('error' in guard) return guard;
  const invite_only = await getBoolSetting('invite_only', true);
  const app_name    = (await getSetting('app_name', APP_NAME)) || APP_NAME;
  return { data: { invite_only, app_name } };
}

export async function adminUpdateSettings(data: Record<string, unknown>) {
  const guard = await adminGuard();
  if ('error' in guard) return guard;
  const user = guard.user;

  const parsed = appSettingsSchema.safeParse(data);
  if (!parsed.success) return { error: 'Validation failed', issues: parsed.error.issues };

  const changed: string[] = [];
  if (parsed.data.invite_only !== undefined) {
    await setSetting('invite_only', parsed.data.invite_only ? 'true' : 'false');
    changed.push('invite_only');
  }
  if (parsed.data.app_name !== undefined) {
    await setSetting('app_name', parsed.data.app_name);
    changed.push('app_name');
  }
  invalidateSettingsCache();
  await audit({ userId: user.id, action: 'settings_update',
    targetType: 'app_settings', targetId: null,
    details: { changed } });
  if (changed.length === 0) return { error: 'No changes' };
  return { ok: true, data: { changed } };
}
