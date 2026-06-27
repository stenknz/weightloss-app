'use server';

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { exerciseLogSchema } from '@/lib/validation';
import { todayISO } from '@/lib/utils';
import { audit } from '@/lib/audit';

export async function createExercise(data: Record<string, unknown>) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const parsed = exerciseLogSchema.safeParse(data);
  if (!parsed.success) return { error: 'Validation failed' };

  const date = parsed.data.entry_date || todayISO();
  const r = await query<{ id: number }>(
    `INSERT INTO exercise_logs
       (user_id, entry_date, activity, duration_min, calories_burned, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      user.id,
      date,
      parsed.data.activity,
      parsed.data.duration_min ?? null,
      parsed.data.calories_burned ?? null,
      parsed.data.notes ?? null
    ]
  );
  await audit({ userId: user.id, action: 'exercise_log_create',
    targetType: 'exercise_log', targetId: r.rows[0].id,
    details: { date, activity: parsed.data.activity } });
  return { id: r.rows[0].id };
}

export async function deleteExercise(id: number) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  if (!Number.isFinite(id)) return { error: 'Invalid id' };
  const r = await query(
    'DELETE FROM exercise_logs WHERE id = $1 AND user_id = $2',
    [id, user.id]
  );
  if (r.rowCount === 0) return { error: 'Not found' };
  await audit({ userId: user.id, action: 'exercise_log_delete',
    targetType: 'exercise_log', targetId: id });
  return { ok: true };
}
