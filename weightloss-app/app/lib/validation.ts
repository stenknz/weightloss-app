// =============================================================================
// Zod validation schemas shared by API routes
// =============================================================================
import { z } from 'zod';
import { ACTIVITY_LEVELS, MEALS, SEXES } from './constants';

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const emailString = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address')
  .max(254);

export const nonEmpty = (max: number, field: string) =>
  z.string().trim().min(1, `${field} is required`).max(max);

export const loginSchema = z.object({
  email: emailString,
  password: z.string().min(1, 'Password is required').max(256)
});

export const registerSchema = z.object({
  email: emailString,
  password: z.string().min(10).max(256),
  name: nonEmpty(120, 'Name'),
  invite_code: z.string().trim().min(4).max(64)
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(256),
  new_password: z.string().min(10).max(256)
});

export const profileSchema = z.object({
  name: nonEmpty(120, 'Name').optional(),
  sex: z.enum(SEXES).nullable().optional(),
  age: z.number().int().min(0).max(130).nullable().optional(),
  height_cm: z.number().positive().max(300).nullable().optional(),
  activity_level: z.enum(ACTIVITY_LEVELS).nullable().optional(),
  target_weight_kg: z.number().positive().max(500).nullable().optional(),
  target_calorie_deficit: z.number().int().positive().max(5000).nullable().optional(),
  target_date: dateString.nullable().optional(),
  calorie_target: z.number().int().positive().max(20000).nullable().optional(),
  protein_target_g: z.number().int().min(0).max(1000).nullable().optional(),
  carbs_target_g: z.number().int().min(0).max(2000).nullable().optional(),
  fat_target_g: z.number().int().min(0).max(500).nullable().optional()
});

export const weighInSchema = z.object({
  entry_date: dateString,
  weight_kg: z.number().positive().max(500),
  note: z.string().trim().max(1000).optional().nullable()
});

export const measurementSchema = z.object({
  entry_date: dateString,
  waist_cm: z.number().positive().max(300).optional().nullable(),
  chest_cm: z.number().positive().max(300).optional().nullable(),
  hips_cm:  z.number().positive().max(300).optional().nullable(),
  thigh_cm: z.number().positive().max(300).optional().nullable(),
  arm_cm:   z.number().positive().max(300).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable()
});

export const foodLogSchema = z.object({
  entry_date: dateString,
  meal: z.enum(MEALS).optional().nullable(),
  description: nonEmpty(500, 'Description'),
  calories: z.number().min(0).max(50000),
  protein_g: z.number().min(0).max(2000).optional().nullable(),
  carbs_g:   z.number().min(0).max(2000).optional().nullable(),
  fat_g:     z.number().min(0).max(2000).optional().nullable()
});

export const exerciseLogSchema = z.object({
  entry_date: dateString,
  activity: nonEmpty(120, 'Activity'),
  duration_min: z.number().int().min(0).max(1440).optional().nullable(),
  calories_burned: z.number().min(0).max(20000).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable()
});

export const waterLogSchema = z.object({
  entry_date: dateString,
  amount_ml: z.number().int().positive().max(10000)
});

export const stepLogSchema = z.object({
  entry_date: dateString,
  steps: z.number().int().min(0).max(200000)
});

export const dailyNoteSchema = z.object({
  entry_date: dateString,
  body: z.string().trim().min(1).max(20000)
});

export const createInviteSchema = z.object({
  email: emailString.optional().nullable(),
  note: z.string().trim().max(255).optional().nullable(),
  expires_in_days: z.number().int().positive().max(365).optional().nullable(),
  max_uses: z.number().int().positive().max(100).optional()
});

export const adminUpdateUserSchema = z.object({
  name: nonEmpty(120, 'Name').optional(),
  email: emailString.optional(),
  role: z.enum(['user', 'admin']).optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(10).max(256).optional()
});

export const appSettingsSchema = z.object({
  invite_only: z.boolean().optional(),
  app_name: z.string().trim().min(1).max(64).optional()
});
