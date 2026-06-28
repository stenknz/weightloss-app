'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';
import { WeightChart } from './WeightChart';
import { fmtDate, round1, todayISO } from '@/lib/utils';
import { createWeighIn, deleteWeighIn } from '@/lib/actions/weigh-in';

type Row = { id: number; entry_date: string; weight_kg: string; note: string | null };

export function WeighInClient({ initial, targetKg }: { initial: Row[]; targetKg: string | null }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [date, setDate] = useState(todayISO());
  const [kg, setKg] = useState('');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const w = Number(kg);
    if (!Number.isFinite(w) || w <= 0) { toast('err', 'Enter a valid weight'); return; }
    try {
      const result = await createWeighIn({ entry_date: date, weight_kg: w, note: note || null });
      if (result.error) { toast('err', result.error); return; }
      // Update local list
      setRows((prev) => {
        const without = prev.filter((r) => r.entry_date !== date);
        return [{ id: result.id!, entry_date: date, weight_kg: String(w), note: note || null }, ...without]
          .sort((a, b) => b.entry_date.localeCompare(a.entry_date));
      });
      setKg(''); setNote(''); setDate(todayISO());
      toast('ok', 'Saved');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  async function remove(id: number) {
    if (!confirm('Delete this weigh-in?')) return;
    try {
      const result = await deleteWeighIn(id);
      if (result.error) { toast('err', result.error); return; }
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast('ok', 'Deleted');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  const chartData = [...rows]
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    .map((r) => ({ date: r.entry_date, kg: Number.parseFloat(r.weight_kg) }));

  return (
    <div className="space-y-3">
      <form onSubmit={save} className="card grid grid-cols-1 sm:grid-cols-4 gap-2">
        <label className="block">
          <span className="label">Date</span>
          <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Weight (kg)</span>
          <input className="input" type="number" step="0.1" min="0.1" max="500" required
                 value={kg} onChange={(e) => setKg(e.target.value)} />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Note</span>
          <input className="input" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="sm:col-span-4">
          <button className="btn-primary" disabled={pending}>Save</button>
        </div>
      </form>

      {chartData.length > 0 && (
        <div className="card">
          <WeightChart data={chartData} targetKg={targetKg ? Number.parseFloat(targetKg) : null} />
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold mb-2">History</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No weigh-ins yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Weight</th><th>Note</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.entry_date)}</td>
                  <td className="font-medium">{round1(r.weight_kg)} kg</td>
                  <td className="text-muted">{r.note || '—'}</td>
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
