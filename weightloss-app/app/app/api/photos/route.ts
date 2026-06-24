import { NextRequest } from 'next/server';
import { json, err, parseFormData } from '@/lib/api';
import { query } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getClientIp, requireUser, requireCsrf } from '@/lib/auth';
import { savePhoto, listUserPhotos, UploadError, PhotoRow } from '@/lib/uploads';
import { todayISO } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const url = new URL(request.url);
  const date = url.searchParams.get('date') || undefined;
  const items: PhotoRow[] = await listUserPhotos(auth.user.id, date);
  return json({ items });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const csrf = await requireCsrf(request, auth.user);
  if (csrf) return csrf;

  const form = await parseFormData(request);
  if (!form) return err('Invalid form data', 400);

  const file = form.get('file');
  if (!(file instanceof File)) return err('No file uploaded', 400);
  const date = (form.get('date') as string | null) || todayISO();
  const caption = (form.get('caption') as string | null) || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return err('Invalid date', 400);

  try {
    const stored = await savePhoto({
      userId: auth.user.id,
      date,
      file,
      caption: caption ? caption.slice(0, 500) : null
    });
    await audit({ userId: auth.user.id, action: 'photo_upload',
      targetType: 'photo', targetId: stored.id, ip: await getClientIp(request),
      details: { date, size: stored.size } });
    return json({ id: stored.id, filename: stored.filename, size: stored.size });
  } catch (e) {
    if (e instanceof UploadError) return err(e.message, 400, { code: e.code });
    console.error('photo upload failed', e);
    return err('Upload failed', 500);
  }
}
