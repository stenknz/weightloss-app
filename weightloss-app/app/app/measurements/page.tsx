import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { MeasurementsClient } from '@/components/MeasurementsClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Measurements — Weight Loss',
};

export default async function MeasurementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const r = await query<any>(
    `SELECT id, entry_date::text AS entry_date,
            waist_cm::text AS waist_cm, chest_cm::text AS chest_cm,
            hips_cm::text  AS hips_cm,  thigh_cm::text AS thigh_cm,
            arm_cm::text   AS arm_cm,   note
       FROM measurements WHERE user_id = $1 ORDER BY entry_date DESC LIMIT 200`,
    [user.id]
  );
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Measurements</h1>
      <MeasurementsClient initial={r.rows} />
    </div>
  );
}
