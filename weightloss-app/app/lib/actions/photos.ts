'use server';

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { savePhoto, deletePhoto as deletePhotoFile, UploadError } from '@/lib/uploads';
import { todayISO } from '@/lib/utils';

export async function createPhoto(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const file = formData.get('file');
  if (!(file instanceof File)) return { error: 'No file uploaded' };
  const date = (formData.get('date') as string) || todayISO();
  const caption = (formData.get('caption') as string) || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date' };

  try {
    const stored = await savePhoto({
      userId: user.id,
      date,
      file,
      caption: caption ? caption.slice(0, 500) : null
    });
    await audit({ userId: user.id, action: 'photo_upload',
      targetType: 'photo', targetId: stored.id, details: { date, size: stored.size } });
    return { id: stored.id, filename: stored.filename, size: stored.size };
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    console.error('photo upload failed', e);
    return { error: 'Upload failed' };
  }
}

export async function deletePhoto(id: number) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const ok = await deletePhotoFile(user.id, id);
  if (!ok) return { error: 'Not found' };

  await audit({ userId: user.id, action: 'photo_delete',
    targetType: 'photo', targetId: id });

  return { ok: true };
}
