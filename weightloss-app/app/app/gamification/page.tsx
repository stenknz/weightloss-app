import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getGamificationData } from '@/lib/actions/gamification';
import GamificationClient from './GamificationClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Gamification — Weight Loss' };

export default async function GamificationPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const data = await getGamificationData();
  if ('error' in data) return <div className="text-center py-8" style={{color:'rgb(var(--muted))'}}>{data.error}</div>;

  return <GamificationClient data={data} />;
}
