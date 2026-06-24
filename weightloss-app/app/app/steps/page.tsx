import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { StepsClient } from '@/components/StepsClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function StepsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const r = await query<any>(
    `SELECT id, entry_date::text AS entry_date, steps
       FROM step_logs WHERE user_id = $1 ORDER BY entry_date DESC LIMIT 200`,
    [user.id]
  );
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Steps</h1>
      <StepsClient initial={r.rows} />
    </div>
  );
}
