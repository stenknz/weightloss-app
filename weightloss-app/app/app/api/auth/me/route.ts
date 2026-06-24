import { json } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { getBoolSetting, getSetting } from '@/lib/settings';
import { APP_NAME } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  const inviteOnly = await getBoolSetting('invite_only', true);
  const appName = (await getSetting('app_name', APP_NAME)) || APP_NAME;
  return json({
    user: user
      ? {
          id: user.id, email: user.email, name: user.name, role: user.role,
          sex: user.sex, age: user.age, height_cm: user.height_cm,
          activity_level: user.activity_level,
          target_weight_kg: user.target_weight_kg,
          target_calorie_deficit: user.target_calorie_deficit,
          target_date: user.target_date,
          calorie_target: user.calorie_target,
          protein_target_g: user.protein_target_g,
          carbs_target_g: user.carbs_target_g,
          fat_target_g: user.fat_target_g
        }
      : null,
    invite_only: inviteOnly,
    app_name: appName
  });
}
