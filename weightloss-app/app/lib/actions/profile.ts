'use server';

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { profileSchema } from '@/lib/validation';
import { audit } from '@/lib/audit';
import { z } from 'zod';
import { headers } from 'next/headers';

export async function updateProfile(data: Record<string, unknown>) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) return { error: 'Validation failed' };

  const b = parsed.data;
  const name     = b.name ?? null;
  const sex      = b.sex ?? null;
  const activity = b.activity_level ?? null;
  const age      = b.age ?? null;
  const height_cm      = b.height_cm ?? null;
  const target_weight  = b.target_weight_kg ?? null;

  const sets: string[] = [];
  const params: unknown[] = [];
  const add = (col: string, val: unknown) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  if (name !== null) add('name', name);
  if (sex != null) add('sex', sex);
  if (activity != null) add('activity_level', activity);
  if (age !== null) add('age', age);
  if (height_cm !== null) add('height_cm', height_cm);
  if (target_weight !== null) add('target_weight_kg', target_weight);
  if (sets.length === 0) return { ok: true, updated: 0 };

  params.push(user.id);
  await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}`, params);

  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  await audit({ userId: user.id, action: 'profile_update',
    targetType: 'user', targetId: user.id, ip });

  return { ok: true };
}
