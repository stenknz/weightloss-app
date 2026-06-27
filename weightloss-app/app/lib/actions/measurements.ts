'use server';

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { measurementSchema } from '@/lib/validation';
import { todayISO } from '@/lib/utils';

const FIELDS = ['waist_cm', 'chest_cm', 'hips_cm', 'thigh_cm', 'arm_cm'] as const;

export async function createMeasurement(data: Record<string, unknown>) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const parsed = measurementSchema.safeParse(data);
  if (!parsed.success) return { error: 'Validation failed' };

  const date = parsed.data.entry_date || todayISO();
  const values = FIELDS.map((f) => parsed.data[f] ?? null);

  const r = await query<{ id: number }>(
    `INSERT INTO measurements (user_id, entry_date, waist_cm, chest_cm, hips_cm, thigh_cm, arm_cm, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, entry_date) DO UPDATE
       SET waist_cm = EXCLUDED.waist_cm,
           chest_cm = EXCLUDED.chest_cm,
           hips_cm  = EXCLUDED.hips_cm,
           thigh_cm = EXCLUDED.thigh_cm,
           arm_cm   = EXCLUDED.arm_cm,
           note     = EXCLUDED.note
     RETURNING id`,
    [user.id, date, ...values, parsed.data.note ?? null]
  );
  await audit({ userId: user.id, action: 'measurements_upsert',
    targetType: 'measurements', targetId: r.rows[0].id, details: { date } });

  return { id: r.rows[0].id, entry_date: date };
}

export async function deleteMeasurement(id: number) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const r = await query(
    'DELETE FROM measurements WHERE id = $1 AND user_id = $2',
    [id, user.id]
  );
  if (r.rowCount === 0) return { error: 'Not found' };

  await audit({ userId: user.id, action: 'measurements_delete',
    targetType: 'measurements', targetId: id });

  return { ok: true };
}
