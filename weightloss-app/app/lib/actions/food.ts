'use server';

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { foodLogSchema } from '@/lib/validation';
import { todayISO } from '@/lib/utils';
import { audit } from '@/lib/audit';
import { handleEvent } from '@/lib/gamification';

export async function createFood(data: Record<string, unknown>) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const parsed = foodLogSchema.safeParse(data);
  if (!parsed.success) return { error: 'Validation failed' };

  const date = parsed.data.entry_date || todayISO();
  const r = await query<{ id: number }>(
    `INSERT INTO food_logs
       (user_id, entry_date, meal, description, calories, protein_g, carbs_g, fat_g, fibre_g, sugar_g)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      user.id,
      date,
      parsed.data.meal ?? null,
      parsed.data.description,
      parsed.data.calories,
      parsed.data.protein_g ?? null,
      parsed.data.carbs_g ?? null,
      parsed.data.fat_g ?? null,
      parsed.data.fibre_g ?? null,
      parsed.data.sugar_g ?? null
    ]
  );
  await audit({ userId: user.id, action: 'food_log_create',
    targetType: 'food_log', targetId: r.rows[0].id,
    details: { date, calories: parsed.data.calories } });
  const game = await handleEvent({ userId: user.id, type: 'food_logged', sourceTable: 'food_logs', sourceId: r.rows[0].id, data: { calories: parsed.data.calories, protein_g: parsed.data.protein_g, fibre_g: parsed.data.fibre_g } });
  return { id: r.rows[0].id, game };
}

export async function deleteFood(id: number) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  if (!Number.isFinite(id)) return { error: 'Invalid id' };
  const r = await query(
    'DELETE FROM food_logs WHERE id = $1 AND user_id = $2',
    [id, user.id]
  );
  if (r.rowCount === 0) return { error: 'Not found' };
  await audit({ userId: user.id, action: 'food_log_delete',
    targetType: 'food_log', targetId: id });
  return { ok: true };
}
