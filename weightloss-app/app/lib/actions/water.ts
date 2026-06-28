'use server';

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { waterLogSchema } from '@/lib/validation';
import { todayISO } from '@/lib/utils';
import { audit } from '@/lib/audit';
import { handleEvent } from '@/lib/gamification';

export async function createWater(data: Record<string, unknown>) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const parsed = waterLogSchema.safeParse(data);
  if (!parsed.success) return { error: 'Validation failed' };

  const date = parsed.data.entry_date || todayISO();
  const r = await query<{ id: number }>(
    `INSERT INTO water_logs (user_id, entry_date, amount_ml)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [user.id, date, parsed.data.amount_ml]
  );
  await audit({ userId: user.id, action: 'water_log_create',
    targetType: 'water_log', targetId: r.rows[0].id,
    details: { date, amount_ml: parsed.data.amount_ml } });
  const game = await handleEvent({ userId: user.id, type: 'water_logged', sourceTable: 'water_logs', sourceId: r.rows[0].id, data: { amount_ml: parsed.data.amount_ml } });
  return { id: r.rows[0].id, game };
}

export async function deleteWater(id: number) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  if (!Number.isFinite(id)) return { error: 'Invalid id' };
  const r = await query(
    'DELETE FROM water_logs WHERE id = $1 AND user_id = $2',
    [id, user.id]
  );
  if (r.rowCount === 0) return { error: 'Not found' };
  await audit({ userId: user.id, action: 'water_log_delete',
    targetType: 'water_log', targetId: id });
  return { ok: true };
}
