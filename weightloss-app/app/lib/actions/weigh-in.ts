'use server';

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { weighInSchema } from '@/lib/validation';
import { todayISO } from '@/lib/utils';
import { audit } from '@/lib/audit';
import { handleEvent } from '@/lib/gamification';

export async function createWeighIn(data: Record<string, unknown>) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const parsed = weighInSchema.safeParse(data);
  if (!parsed.success) return { error: 'Validation failed' };

  const date = parsed.data.entry_date || todayISO();
  const r = await query<{ id: number }>(
    `INSERT INTO weigh_ins (user_id, entry_date, weight_kg, note)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, entry_date) DO UPDATE
       SET weight_kg = EXCLUDED.weight_kg, note = EXCLUDED.note
     RETURNING id`,
    [user.id, date, parsed.data.weight_kg, parsed.data.note ?? null]
  );
  await audit({ userId: user.id, action: 'weigh_in_upsert',
    targetType: 'weigh_in', targetId: r.rows[0].id,
    details: { date, weight_kg: parsed.data.weight_kg } });
  const game = await handleEvent({ userId: user.id, type: 'weigh_in_logged', sourceTable: 'weigh_ins', sourceId: r.rows[0].id, data: { weight_kg: parsed.data.weight_kg } });
  return { id: r.rows[0].id, entry_date: date, game };
}

export async function deleteWeighIn(id: number) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  if (!Number.isFinite(id)) return { error: 'Invalid id' };
  const r = await query(
    'DELETE FROM weigh_ins WHERE id = $1 AND user_id = $2',
    [id, user.id]
  );
  if (r.rowCount === 0) return { error: 'Not found' };
  await audit({ userId: user.id, action: 'weigh_in_delete',
    targetType: 'weigh_in', targetId: id });
  return { ok: true };
}
