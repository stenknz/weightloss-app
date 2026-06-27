'use server';

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';

const TABLES = [
  'weigh_ins', 'measurements', 'photos', 'food_logs',
  'exercise_logs', 'water_logs', 'step_logs', 'daily_notes'
] as const;

export async function exportUserData(format: 'json' | 'csv' = 'json', table?: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const out: Record<string, unknown[]> = {};
  if (table && (TABLES as readonly string[]).includes(table)) {
    out[table] = (await query(
      `SELECT * FROM ${table} WHERE user_id = $1 ORDER BY id`,
      [user.id]
    )).rows;
  } else {
    for (const t of TABLES) {
      out[t] = (await query(
        `SELECT * FROM ${t} WHERE user_id = $1 ORDER BY id`,
        [user.id]
      )).rows;
    }
  }

  await audit({ userId: user.id, action: 'data_export',
    targetType: 'user', targetId: user.id,
    details: { format, table } });

  if (format === 'csv') {
    return { data: out, format: 'csv' as const };
  }

  const userRow = (await query(
    `SELECT id, email, name, role, is_active, sex, age, height_cm, activity_level,
            target_weight_kg, target_calorie_deficit, target_date,
            calorie_target, protein_target_g, carbs_target_g, fat_target_g,
            created_at, updated_at
       FROM users WHERE id = $1`,
    [user.id]
  )).rows[0] ?? null;

  return {
    data: {
      exported_at: new Date().toISOString(),
      user: userRow,
      data: out
    },
    format: 'json' as const
  };
}
