import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { NotesClient } from '@/components/NotesClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Notes — Weight Loss',
};

export default async function NotesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const r = await query<any>(
    `SELECT id, entry_date::text AS entry_date, body, updated_at
       FROM daily_notes WHERE user_id = $1 ORDER BY entry_date DESC LIMIT 200`,
    [user.id]
  );
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Daily notes</h1>
      <NotesClient initial={r.rows} />
    </div>
  );
}
