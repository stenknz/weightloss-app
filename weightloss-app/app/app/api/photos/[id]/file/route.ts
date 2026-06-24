import { NextRequest } from 'next/server';
import { err } from '@/lib/api';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { query } from '@/lib/db';
import { userDir } from '@/lib/uploads';
import { requireUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, ctx: { params: { id: string } }) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const id = Number.parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) return err('Invalid id', 400);
  const r = await query<{ filename: string; mime_type: string | null }>(
    'SELECT filename, mime_type FROM photos WHERE id = $1 AND user_id = $2',
    [id, auth.user.id]
  );
  const row = r.rows[0];
  if (!row) return err('Not found', 404);

  const path = join(userDir(auth.user.id), row.filename);
  let data: Buffer;
  try {
    data = await readFile(path);
  } catch {
    return err('File missing on disk', 410);
  }

  return new Response(data as unknown as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': row.mime_type || 'application/octet-stream',
      'Content-Length': String(data.byteLength),
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
