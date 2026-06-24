// =============================================================================
// Photo upload helpers
// =============================================================================
import { mkdir, writeFile, stat, unlink, readdir, rm } from 'fs/promises';
import { join, extname } from 'path';
import { randomBytes } from 'crypto';
import {
  UPLOADS_DIR,
  ALLOWED_MIME_TYPES,
  maxPhotoSizeBytes,
  maxPhotoStorageBytes
} from './constants';
import { query } from './db';

export type StoredPhoto = {
  id: number;
  filename: string;
  size: number;
  path: string;
};

function userDir(userId: number): string {
  return join(UPLOADS_DIR, String(userId));
}

export async function ensureUserDir(userId: number): Promise<string> {
  const dir = userDir(userId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export function extForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg': return '.jpg';
    case 'image/png':  return '.png';
    case 'image/webp': return '.webp';
    default: return '.bin';
  }
}

function isAllowedMime(mime: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

/**
 * Persist a photo upload. Validates size, MIME type, per-user storage cap,
 * and daily upload count. Returns the stored record.
 */
export async function savePhoto(opts: {
  userId: number;
  date: string; // YYYY-MM-DD
  file: File;
  caption?: string | null;
}): Promise<StoredPhoto> {
  if (!isAllowedMime(opts.file.type)) {
    throw new UploadError('UNSUPPORTED_TYPE', `Unsupported file type: ${opts.file.type}`);
  }
  const maxSize = maxPhotoSizeBytes();
  if (opts.file.size <= 0) {
    throw new UploadError('EMPTY_FILE', 'Uploaded file is empty');
  }
  if (opts.file.size > maxSize) {
    throw new UploadError('TOO_LARGE', `File exceeds ${Math.round(maxSize / 1024 / 1024)} MB`);
  }

  // Per-user storage cap
  const usage = await query<{ used: number }>(
    'SELECT photo_storage_used_bytes AS used FROM users WHERE id = $1',
    [opts.userId]
  );
  const used = Number(usage.rows[0]?.used ?? 0);
  const cap = maxPhotoStorageBytes();
  if (used + opts.file.size > cap) {
    throw new UploadError('STORAGE_FULL', 'Per-user photo storage limit reached');
  }

  // Daily upload cap
  const daily = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM photos
      WHERE user_id = $1 AND entry_date = $2`,
    [opts.userId, opts.date]
  );
  const todayCount = Number(daily.rows[0]?.n ?? 0);
  const maxPerDay = Number.parseInt(process.env.MAX_PHOTOS_PER_DAY || '50', 10);
  if (todayCount >= maxPerDay) {
    throw new UploadError('DAILY_LIMIT', `Daily photo limit of ${maxPerDay} reached`);
  }

  // Persist file
  const dir = await ensureUserDir(opts.userId);
  const safeName = `${Date.now()}-${randomBytes(8).toString('hex')}${extForMime(opts.file.type)}`;
  const filePath = join(dir, safeName);
  const buf = Buffer.from(await opts.file.arrayBuffer());
  await writeFile(filePath, buf);

  // Insert DB row
  const insert = await query<{ id: number }>(
    `INSERT INTO photos (user_id, entry_date, filename, original_name, mime_type, size_bytes, caption)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      opts.userId,
      opts.date,
      safeName,
      opts.file.name.slice(0, 255),
      opts.file.type,
      opts.file.size,
      opts.caption ?? null
    ]
  );

  // Bump usage
  await query(
    'UPDATE users SET photo_storage_used_bytes = photo_storage_used_bytes + $1 WHERE id = $2',
    [opts.file.size, opts.userId]
  );

  return {
    id: insert.rows[0].id,
    filename: safeName,
    size: opts.file.size,
    path: filePath
  };
}

export async function deletePhoto(userId: number, photoId: number): Promise<boolean> {
  const r = await query<{ filename: string; size_bytes: number }>(
    'SELECT filename, size_bytes FROM photos WHERE id = $1 AND user_id = $2',
    [photoId, userId]
  );
  const row = r.rows[0];
  if (!row) return false;
  const filePath = join(userDir(userId), row.filename);
  try {
    await unlink(filePath);
  } catch (err) {
    console.warn('[uploads] could not unlink file (already gone?)', filePath, err);
  }
  await query('DELETE FROM photos WHERE id = $1', [photoId]);
  await query(
    'UPDATE users SET photo_storage_used_bytes = GREATEST(0, photo_storage_used_bytes - $1) WHERE id = $2',
    [row.size_bytes, userId]
  );
  return true;
}

export async function listUserPhotos(userId: number, date?: string) {
  if (date) {
    return (
      await query<PhotoRow>(
        `SELECT id, entry_date::text AS entry_date, filename, original_name,
                mime_type, size_bytes::int AS size_bytes, caption, created_at
           FROM photos
          WHERE user_id = $1 AND entry_date = $2
          ORDER BY created_at DESC`,
        [userId, date]
      )
    ).rows;
  }
  return (
    await query<PhotoRow>(
      `SELECT id, entry_date::text AS entry_date, filename, original_name,
              mime_type, size_bytes::int AS size_bytes, caption, created_at
         FROM photos
        WHERE user_id = $1
        ORDER BY entry_date DESC, created_at DESC
        LIMIT 200`,
      [userId]
    )
  ).rows;
}

export type PhotoRow = {
  id: number;
  entry_date: string;
  filename: string;
  original_name: string | null;
  mime_type: string | null;
  size_bytes: number;
  caption: string | null;
  created_at: Date;
};

export class UploadError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'UploadError';
  }
}

// Helpers for the seed / restore flow
export async function userDirSize(userId: number): Promise<number> {
  const dir = userDir(userId);
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    let total = 0;
    for (const e of entries) {
      if (e.isFile()) {
        const s = await stat(join(dir, e.name));
        total += s.size;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export async function deleteUserDir(userId: number): Promise<void> {
  await rm(userDir(userId), { recursive: true, force: true });
}

export { userDir };
