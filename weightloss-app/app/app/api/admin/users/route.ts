import { NextRequest } from 'next/server';
import { json } from '@/lib/api';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;
  const r = await query(
    `SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at,
            (SELECT COUNT(*)::int FROM weigh_ins WHERE user_id = u.id) AS weigh_ins,
            (SELECT COUNT(*)::int FROM food_logs WHERE user_id = u.id) AS food_logs,
            (SELECT COUNT(*)::int FROM photos  WHERE user_id = u.id) AS photos,
            u.photo_storage_used_bytes::int AS photo_storage_used_bytes
       FROM users u
       ORDER BY u.created_at ASC`
  );
  return json({ items: r.rows });
}
