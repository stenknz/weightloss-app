'use server';

import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { dailyNoteSchema } from '@/lib/validation';
import { todayISO } from '@/lib/utils';

export async function createNote(data: { entry_date: string; body: string }) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const parsed = dailyNoteSchema.safeParse(data);
  if (!parsed.success) return { error: 'Validation failed' };

  const date = parsed.data.entry_date || todayISO();
  const r = await query<{ id: number }>(
    `INSERT INTO daily_notes (user_id, entry_date, body)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, entry_date) DO UPDATE
       SET body = EXCLUDED.body
     RETURNING id`,
    [user.id, date, parsed.data.body]
  );
  await audit({ userId: user.id, action: 'daily_note_upsert',
    targetType: 'daily_note', targetId: r.rows[0].id, details: { date } });

  return { id: r.rows[0].id };
}

export async function deleteNote(id: number) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const r = await query(
    'DELETE FROM daily_notes WHERE id = $1 AND user_id = $2',
    [id, user.id]
  );
  if (r.rowCount === 0) return { error: 'Not found' };

  await audit({ userId: user.id, action: 'daily_note_delete',
    targetType: 'daily_note', targetId: id });

  return { ok: true };
}
