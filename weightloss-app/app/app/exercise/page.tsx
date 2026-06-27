import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { ExerciseClient } from '@/components/ExerciseClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Exercise — Weight Loss',
};

export default async function ExercisePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const r = await query<any>(
    `SELECT id, entry_date::text AS entry_date, activity,
            duration_min, calories_burned::text AS calories_burned, notes
       FROM exercise_logs WHERE user_id = $1
       ORDER BY entry_date DESC, created_at DESC LIMIT 200`,
    [user.id]
  );
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Exercise</h1>
      <ExerciseClient initial={r.rows} />
    </div>
  );
}
