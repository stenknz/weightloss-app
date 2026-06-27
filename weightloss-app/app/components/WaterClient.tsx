'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';
import { fmtDate, todayISO } from '@/lib/utils';
import { Droplet } from 'lucide-react';
import { createWater, deleteWater } from '@/lib/actions/water';

type Row = { id: number; entry_date: string; amount_ml: number };

export function WaterClient({ initial, goalMl }: { initial: Row[]; goalMl: number }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('250');
  const [pending, startTransition] = useTransition();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) { toast('err', 'Enter a valid amount'); return; }
    try {
      const result = await createWater({ entry_date: date, amount_ml: Math.round(n) });
      if (result.error) { toast('err', result.error); return; }
      setRows((prev) => [{ id: result.id!, entry_date: date, amount_ml: Math.round(n) }, ...prev]);
      setAmount('250');
      toast('ok', 'Logged');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  async function remove(id: number) {
    if (!confirm('Delete this entry?')) return;
    try {
      const result = await deleteWater(id);
      if (result.error) { toast('err', result.error); return; }
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast('ok', 'Deleted');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  // Sum by date
  const byDate = new Map<string, number>();
  for (const r of rows) byDate.set(r.entry_date, (byDate.get(r.entry_date) || 0) + r.amount_ml);
  const todayTotal = byDate.get(todayISO()) || 0;
  const pct = Math.round((todayTotal / goalMl) * 100);

  return (
    <div className="space-y-3">
      <form onSubmit={save} className="card grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="block">
          <span className="label">Date</span>
          <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Amount (ml)</span>
          <input className="input" type="number" min="1" max="10000" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <div className="flex items-end gap-2 flex-wrap">
          {[250, 500, 750, 1000].map((v) => (
            <button key={v} type="button" className="btn" onClick={() => setAmount(String(v))}>{v} ml</button>
          ))}
          <button className="btn-primary" disabled={pending}>Log</button>
        </div>
      </form>

      <div className="card">
        <div className="flex items-center gap-2">
          <Droplet size={18} className="text-accent" />
          <span className="text-sm"><span className="font-semibold">{(todayTotal / 1000).toFixed(2)} L consumed</span> &middot; Goal: {(goalMl / 1000).toFixed(1)} L</span>
        </div>
        <div className="h-2 mt-2 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-2">History</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No water logs yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Amount</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.entry_date)}</td>
                  <td className="font-medium">{r.amount_ml} ml</td>
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
