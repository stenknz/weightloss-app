import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { FoodClient } from '@/components/FoodClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function FoodPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const r = await query<any>(
    `SELECT id, entry_date::text AS entry_date, meal, description,
            calories::text AS calories, protein_g::text AS protein_g,
            carbs_g::text   AS carbs_g,   fat_g::text   AS fat_g
       FROM food_logs WHERE user_id = $1
       ORDER BY entry_date DESC, created_at DESC LIMIT 200`,
    [user.id]
  );
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Food log</h1>
      <FoodClient initial={r.rows}
        targets={{
          calories: user.calorie_target,
          protein:  user.protein_target_g,
          carbs:    user.carbs_target_g,
          fat:      user.fat_target_g
        }} />
    </div>
  );
}
