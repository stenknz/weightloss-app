import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { AdminInvitesClient } from '@/components/AdminInvitesClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminInvitesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') return <div className="text-sm text-muted">Admin access required.</div>;

  const r = await query<any>(
    `SELECT i.id, i.code, i.email, i.note, i.max_uses, i.uses,
            i.expires_at, i.created_at,
            u.email AS created_by_email,
            ub.email AS used_by_email
       FROM invites i
       JOIN users u ON u.id = i.created_by
       LEFT JOIN users ub ON ub.id = i.used_by
       ORDER BY i.created_at DESC`
  );
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Invites</h1>
      <AdminInvitesClient initial={r.rows} />
    </div>
  );
}
