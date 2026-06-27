import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { WaterClient } from '@/components/WaterClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function WaterPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const r = await query<any>(
    `SELECT id, entry_date::text AS entry_date, amount_ml
       FROM water_logs WHERE user_id = $1
       ORDER BY entry_date DESC, created_at DESC LIMIT 200`,
    [user.id]
  );
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Water</h1>
      <WaterClient initial={r.rows} goalMl={user.water_target_ml ?? 2700} />
    </div>
  );
}
