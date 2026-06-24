import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { SettingsClient } from '@/components/SettingsClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return (
    <div className="space-y-3 max-w-lg">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsClient />
    </div>
  );
}
