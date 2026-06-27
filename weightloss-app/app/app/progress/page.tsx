import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { ProgressClient } from '@/components/ProgressClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Progress — Weight Loss',
};

export default async function ProgressPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [weights, measures] = await Promise.all([
    query<{ entry_date: string; weight_kg: string }>(
      `SELECT entry_date::text AS entry_date, weight_kg::text AS weight_kg
         FROM weigh_ins WHERE user_id = $1 ORDER BY entry_date ASC LIMIT 365`,
      [user.id]
    ),
    query<any>(
      `SELECT entry_date::text AS entry_date,
              waist_cm::text AS waist_cm, chest_cm::text AS chest_cm,
              hips_cm::text  AS hips_cm,  thigh_cm::text AS thigh_cm,
              arm_cm::text   AS arm_cm
         FROM measurements WHERE user_id = $1 ORDER BY entry_date ASC LIMIT 365`,
      [user.id]
    )
  ]);

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Progress</h1>
      <ProgressClient
        weightData={weights.rows.map((r) => ({ date: r.entry_date, kg: Number.parseFloat(r.weight_kg) }))}
        measureData={measures.rows.map((r: any) => ({
          date: r.entry_date,
          waist: r.waist_cm ? Number.parseFloat(r.waist_cm) : null,
          chest: r.chest_cm ? Number.parseFloat(r.chest_cm) : null,
          hips: r.hips_cm ? Number.parseFloat(r.hips_cm) : null,
          thigh: r.thigh_cm ? Number.parseFloat(r.thigh_cm) : null,
          arm: r.arm_cm ? Number.parseFloat(r.arm_cm) : null
        }))}
        targetKg={user.target_weight_kg ? Number.parseFloat(user.target_weight_kg) : null}
      />
    </div>
  );
}
