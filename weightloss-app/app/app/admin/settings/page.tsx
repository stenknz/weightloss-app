import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AdminSettingsClient } from '@/components/AdminSettingsClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') return <div className="text-sm text-muted">Admin access required.</div>;
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">App settings</h1>
      <AdminSettingsClient />
    </div>
  );
}
