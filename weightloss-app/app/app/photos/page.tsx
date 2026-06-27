import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { PhotosClient } from '@/components/PhotosClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Progress Photos — Weight Loss',
};

export default async function PhotosPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const r = await query<any>(
    `SELECT id, entry_date::text AS entry_date, filename, original_name,
            mime_type, size_bytes, caption
       FROM photos WHERE user_id = $1
       ORDER BY entry_date DESC, created_at DESC LIMIT 200`,
    [user.id]
  );
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Progress photos</h1>
      <PhotosClient initial={r.rows} maxMb={Number(process.env.MAX_PHOTO_SIZE_MB || 10)} />
    </div>
  );
}
