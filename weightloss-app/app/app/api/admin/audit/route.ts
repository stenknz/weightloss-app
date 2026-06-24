import { NextRequest } from 'next/server';
import { json } from '@/lib/api';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;
  const url = new URL(request.url);
  const limit = Math.min(Number.parseInt(url.searchParams.get('limit') || '200', 10), 1000);

  const r = await query(
    `SELECT a.id, a.user_id, a.action, a.target_type, a.target_id, a.details,
            a.ip_address, a.created_at,
            u.email AS user_email, u.name AS user_name
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT $1`,
    [limit]
  );
  return json({ items: r.rows });
}
