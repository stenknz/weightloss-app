import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { GoalsClient } from '@/components/GoalsClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Goals</h1>
      <GoalsClient initial={{
        target_weight_kg:       user.target_weight_kg,
        target_calorie_deficit: user.target_calorie_deficit,
        target_date:            user.target_date,
        calorie_target:         user.calorie_target,
        protein_target_g:       user.protein_target_g,
        carbs_target_g:         user.carbs_target_g,
        fat_target_g:           user.fat_target_g
      }} />
    </div>
  );
}
