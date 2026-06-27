'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';
import { fmtDate, todayISO } from '@/lib/utils';
import { Footprints } from 'lucide-react';
import { createSteps, deleteSteps } from '@/lib/actions/steps';

type Row = { id: number; entry_date: string; steps: number };

export function StepsClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [date, setDate] = useState(todayISO());
  const [steps, setSteps] = useState('');
  const [pending, startTransition] = useTransition();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(steps);
    if (!Number.isFinite(n) || n < 0) { toast('err', 'Enter a valid step count'); return; }
    try {
      const result = await createSteps({ entry_date: date, steps: Math.round(n) });
      if (result.error) { toast('err', result.error); return; }
      setRows((prev) => {
        const without = prev.filter((r) => r.entry_date !== date);
        return [{ id: result.id!, entry_date: date, steps: Math.round(n) }, ...without]
          .sort((a, b) => b.entry_date.localeCompare(a.entry_date));
      });
      setSteps('');
      toast('ok', 'Saved');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  async function remove(id: number) {
    if (!confirm('Delete this step entry?')) return;
    try {
      const result = await deleteSteps(id);
      if (result.error) { toast('err', result.error); return; }
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast('ok', 'Deleted');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  const todayRow = rows.find((r) => r.entry_date === todayISO());
  const todaySteps = todayRow?.steps || 0;
  const goal = 10000;
  const pct = Math.min(100, Math.round((todaySteps / goal) * 100));

  return (
    <div className="space-y-3">
      <form onSubmit={save} className="card grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="block">
          <span className="label">Date</span>
          <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Steps</span>
          <input className="input" type="number" min="0" max="200000" required value={steps} onChange={(e) => setSteps(e.target.value)} />
        </label>
        <div className="sm:col-span-3">
          <button className="btn-primary" disabled={pending}>Save</button>
        </div>
      </form>

      <div className="card">
        <div className="flex items-center gap-2">
          <Footprints size={18} className="text-accent" />
          <span className="text-sm">Today: <span className="font-semibold">{todaySteps.toLocaleString()}</span> / {goal.toLocaleString()}</span>
        </div>
        <div className="h-2 mt-2 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-2">History</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No step logs yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Steps</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.entry_date)}</td>
                  <td className="font-medium">{r.steps.toLocaleString()}</td>
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
