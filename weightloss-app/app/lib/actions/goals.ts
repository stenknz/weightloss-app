'use server';

import { z } from 'zod';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';

const goalsSchema = z.object({
  target_weight_kg: z.number().positive().max(500).nullable().optional(),
  target_calorie_deficit: z.number().min(0).max(5000).nullable().optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  calorie_target: z.number().min(0).max(20000).nullable().optional(),
  protein_target_g: z.number().min(0).nullable().optional(),
  carbs_target_g: z.number().min(0).nullable().optional(),
  fat_target_g: z.number().min(0).nullable().optional(),
  water_target_ml: z.number().min(500).max(15000).nullable().optional(),
});

export async function updateGoals(data: Record<string, unknown>) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const parsed = goalsSchema.safeParse(data);
  if (!parsed.success) return { error: 'Validation failed' };

  const {
    target_weight_kg, target_calorie_deficit, target_date,
    calorie_target, protein_target_g, carbs_target_g, fat_target_g, water_target_ml,
  } = parsed.data;

  await query(
    `UPDATE users SET
       target_weight_kg       = $1,
       target_calorie_deficit = $2,
       target_date            = $3,
       calorie_target         = $4,
       protein_target_g       = $5,
       carbs_target_g         = $6,
       fat_target_g           = $7,
       water_target_ml        = $8
     WHERE id = $9`,
    [target_weight_kg, target_calorie_deficit, target_date,
     calorie_target, protein_target_g, carbs_target_g, fat_target_g, water_target_ml, user.id]
  );
  await audit({ userId: user.id, action: 'targets_update',
    targetType: 'user', targetId: user.id, details: parsed.data });

  return { ok: true };
}
