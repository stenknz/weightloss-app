import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { AdminUsersClient } from '@/components/AdminUsersClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') return <div className="text-sm text-muted">Admin access required.</div>;

  const r = await query<any>(
    `SELECT id, email, name, role, is_active, created_at,
            (SELECT COUNT(*)::int FROM weigh_ins WHERE user_id = u.id) AS weigh_ins,
            (SELECT COUNT(*)::int FROM food_logs WHERE user_id = u.id) AS food_logs,
            (SELECT COUNT(*)::int FROM photos  WHERE user_id = u.id) AS photos,
            photo_storage_used_bytes::int
       FROM users u ORDER BY created_at DESC`
  );
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Manage users</h1>
      <AdminUsersClient initial={r.rows} currentUserId={user.id} />
    </div>
  );
}
