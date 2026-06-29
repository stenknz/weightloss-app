'use server';

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { stepLogSchema } from '@/lib/validation';
import { todayISO } from '@/lib/utils';
import { audit } from '@/lib/audit';

export async function createSteps(data: Record<string, unknown>) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const parsed = stepLogSchema.safeParse(data);
  if (!parsed.success) return { error: 'Validation failed' };

  const date = parsed.data.entry_date || todayISO();
  const r = await query<{ id: number }>(
    `INSERT INTO step_logs (user_id, entry_date, steps)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, entry_date) DO UPDATE
       SET steps = EXCLUDED.steps
     RETURNING id`,
    [user.id, date, parsed.data.steps]
  );
  await audit({ userId: user.id, action: 'step_log_upsert',
    targetType: 'step_log', targetId: r.rows[0].id,
    details: { date, steps: parsed.data.steps } });
  return { id: r.rows[0].id };
}

export async function deleteSteps(id: number) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  if (!Number.isFinite(id)) return { error: 'Invalid id' };
  const r = await query(
    'DELETE FROM step_logs WHERE id = $1 AND user_id = $2',
    [id, user.id]
  );
  if (r.rowCount === 0) return { error: 'Not found' };
  await audit({ userId: user.id, action: 'step_log_delete',
    targetType: 'step_log', targetId: id });
  return { ok: true };
}
