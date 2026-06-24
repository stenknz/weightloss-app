import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { fmtDateTime } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AdminAuditPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') return <div className="text-sm text-muted">Admin access required.</div>;

  const r = await query<any>(
    `SELECT a.id, a.action, a.target_type, a.target_id, a.details, a.ip_address, a.created_at,
            u.email AS user_email, u.name AS user_name
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC LIMIT 500`
  );

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Audit log</h1>
      <div className="card overflow-x-auto">
        {r.rows.length === 0 ? (
          <p className="text-sm text-muted">No audit entries yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Time</th><th>User</th><th>Action</th><th>Target</th><th>Details</th><th>IP</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row: any) => (
                <tr key={row.id}>
                  <td className="text-xs whitespace-nowrap">{fmtDateTime(row.created_at)}</td>
                  <td>{row.user_email || <span className="text-muted">—</span>}</td>
                  <td><code className="text-xs bg-bg px-1 rounded">{row.action}</code></td>
                  <td className="text-xs text-muted">
                    {row.target_type ? `${row.target_type}#${row.target_id}` : '—'}
                  </td>
                  <td className="text-xs text-muted max-w-[200px] truncate">
                    {row.details ? JSON.stringify(row.details) : '—'}
                  </td>
                  <td className="text-xs text-muted">{row.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
