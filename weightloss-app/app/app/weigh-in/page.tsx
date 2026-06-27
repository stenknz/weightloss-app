import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { WeighInClient } from '@/components/WeighInClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Weigh-in — Weight Loss',
};

export default async function WeighInPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const r = await query<{
    id: number; entry_date: string; weight_kg: string; note: string | null;
  }>(
    `SELECT id, entry_date::text AS entry_date, weight_kg::text AS weight_kg, note
       FROM weigh_ins WHERE user_id = $1 ORDER BY entry_date DESC LIMIT 200`,
    [user.id]
  );
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Weigh-ins</h1>
      <WeighInClient initial={r.rows} targetKg={user.target_weight_kg} />
    </div>
  );
}
