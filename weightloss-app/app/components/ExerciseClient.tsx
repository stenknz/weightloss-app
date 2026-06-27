'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';
import { fmtDate, round0, todayISO } from '@/lib/utils';
import { createExercise, deleteExercise } from '@/lib/actions/exercise';

type Row = {
  id: number; entry_date: string; activity: string;
  duration_min: number | null; calories_burned: string | null; notes: string | null;
};

export function ExerciseClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [date, setDate] = useState(todayISO());
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState('');
  const [burned, setBurned] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, startTransition] = useTransition();
  const num = (v: string) => v === '' ? null : Number(v);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!activity.trim()) { toast('err', 'Activity is required'); return; }
    try {
      const result = await createExercise({
        entry_date: date, activity,
        duration_min: num(duration), calories_burned: num(burned),
        notes: notes || null
      });
      if (result.error) { toast('err', result.error); return; }
      setRows((prev) => [{
        id: result.id!, entry_date: date, activity,
        duration_min: duration ? Number(duration) : null,
        calories_burned: burned || null, notes: notes || null
      }, ...prev]);
      setActivity(''); setDuration(''); setBurned(''); setNotes('');
      toast('ok', 'Saved');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  async function remove(id: number) {
    if (!confirm('Delete this exercise entry?')) return;
    try {
      const result = await deleteExercise(id);
      if (result.error) { toast('err', result.error); return; }
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast('ok', 'Deleted');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={save} className="card grid grid-cols-2 sm:grid-cols-4 gap-2">
        <label className="block col-span-2 sm:col-span-1">
          <span className="label">Date</span>
          <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block col-span-2 sm:col-span-2">
          <span className="label">Activity</span>
          <input className="input" required maxLength={120} value={activity} onChange={(e) => setActivity(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Duration (min)</span>
          <input className="input" type="number" min="0" max="1440" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Burned (kcal)</span>
          <input className="input" type="number" min="0" step="1" value={burned} onChange={(e) => setBurned(e.target.value)} />
        </label>
        <label className="block col-span-2 sm:col-span-4">
          <span className="label">Notes</span>
          <input className="input" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="col-span-2 sm:col-span-4">
          <button className="btn-primary" disabled={pending}>Save</button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-2">History</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No exercise entries yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Activity</th><th>Duration</th><th>Burned</th><th>Notes</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.entry_date)}</td>
                  <td className="font-medium">{r.activity}</td>
                  <td>{r.duration_min ? `${r.duration_min} min` : '—'}</td>
                  <td>{r.calories_burned ? `${round0(r.calories_burned)} kcal` : '—'}</td>
                  <td className="text-muted">{r.notes || '—'}</td>
                  <td className="text-right">
                    <button className="btn-danger" onClick={() => remove(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
