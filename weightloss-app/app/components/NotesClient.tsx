'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';
import { fmtDate, todayISO } from '@/lib/utils';
import { createNote, deleteNote } from '@/lib/actions/notes';

type Row = { id: number; entry_date: string; body: string; updated_at: Date };

export function NotesClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [date, setDate] = useState(todayISO());
  const [body, setBody] = useState('');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [pending, startTransition] = useTransition();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) { toast('err', 'Note cannot be empty'); return; }
    try {
      const result = await createNote({ entry_date: date, body });
      if (result.error) throw new Error(result.error);
      const updated: Row = {
        id: result.id!, entry_date: date, body, updated_at: new Date()
      };
      setRows((prev) => {
        const without = prev.filter((r) => r.entry_date !== date);
        return [updated, ...without].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
      });
      setBody('');
      toast('ok', 'Saved');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  async function remove(id: number) {
    if (!confirm('Delete this note?')) return;
    try {
      const result = await deleteNote(id);
      if (result.error) throw new Error(result.error);
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast('ok', 'Deleted');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={save} className="card">
        <label className="block">
          <span className="label">Date</span>
          <input className="input max-w-xs" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block mt-2">
          <span className="label">Note</span>
          <textarea className="input" rows={5} required maxLength={20000} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <div className="mt-2">
          <button className="btn-primary" disabled={pending}>Save</button>
        </div>
      </form>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="card text-sm text-muted text-center py-6">No notes yet.</div>
        ) : (
          rows.map((r) => {
            const isOpen = !!expanded[r.id];
            return (
              <div key={r.id} className="card">
                <div className="flex items-center justify-between">
                  <button
                    className="text-left font-medium hover:underline"
                    onClick={() => setExpanded((m) => ({ ...m, [r.id]: !m[r.id] }))}
                  >
                    {fmtDate(r.entry_date)}
                  </button>
                  <button className="btn-danger !py-0.5 !px-1.5 text-xs" onClick={() => remove(r.id)}>Delete</button>
                </div>
                <div className={'mt-2 text-sm whitespace-pre-wrap ' + (isOpen ? '' : 'line-clamp-3')}>
                  {r.body}
                </div>
                {r.body.length > 200 && (
                  <button
                    className="text-xs text-accent hover:underline mt-1"
                    onClick={() => setExpanded((m) => ({ ...m, [r.id]: !m[r.id] }))}
                  >
                    {isOpen ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
