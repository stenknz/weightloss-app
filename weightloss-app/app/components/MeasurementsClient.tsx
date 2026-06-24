'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';
import { fmtDate, round1, todayISO } from '@/lib/utils';

type Row = {
  id: number; entry_date: string;
  waist_cm: string | null; chest_cm: string | null; hips_cm: string | null;
  thigh_cm: string | null; arm_cm: string | null; note: string | null;
};

function csrf() {
  const m = document.cookie.match(/(?:^|;\s*)weightloss_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export function MeasurementsClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [date, setDate] = useState(todayISO());
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [hips, setHips]   = useState('');
  const [thigh, setThigh] = useState('');
  const [arm, setArm]     = useState('');
  const [note, setNote]   = useState('');
  const [pending, startTransition] = useTransition();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const num = (v: string) => v === '' ? null : Number(v);
    const w = num(waist), c = num(chest), h = num(hips), t = num(thigh), a = num(arm);
    if ([w, c, h, t, a].every((x) => x == null)) {
      toast('err', 'Enter at least one measurement');
      return;
    }
    try {
      const res = await fetch('/api/measurements', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf() },
        body: JSON.stringify({
          entry_date: date,
          waist_cm: w, chest_cm: c, hips_cm: h, thigh_cm: t, arm_cm: a,
          note: note || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      const updated: Row = {
        id: data.id, entry_date: date,
        waist_cm: w?.toString() ?? null, chest_cm: c?.toString() ?? null,
        hips_cm: h?.toString() ?? null, thigh_cm: t?.toString() ?? null,
        arm_cm: a?.toString() ?? null, note: note || null
      };
      setRows((prev) => {
        const without = prev.filter((r) => r.entry_date !== date);
        return [updated, ...without].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
      });
      setWaist(''); setChest(''); setHips(''); setThigh(''); setArm(''); setNote('');
      toast('ok', 'Saved');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  async function remove(id: number) {
    if (!confirm('Delete this measurement?')) return;
    try {
      const res = await fetch(`/api/measurements/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-csrf-token': csrf() }
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Delete failed');
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast('ok', 'Deleted');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={save} className="card grid grid-cols-2 sm:grid-cols-6 gap-2">
        <label className="block col-span-2 sm:col-span-2">
          <span className="label">Date</span>
          <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block"><span className="label">Waist (cm)</span>
          <input className="input" type="number" step="0.1" min="1" max="300" value={waist} onChange={(e) => setWaist(e.target.value)} />
        </label>
        <label className="block"><span className="label">Chest (cm)</span>
          <input className="input" type="number" step="0.1" min="1" max="300" value={chest} onChange={(e) => setChest(e.target.value)} />
        </label>
        <label className="block"><span className="label">Hips (cm)</span>
          <input className="input" type="number" step="0.1" min="1" max="300" value={hips} onChange={(e) => setHips(e.target.value)} />
        </label>
        <label className="block"><span className="label">Thigh (cm)</span>
          <input className="input" type="number" step="0.1" min="1" max="300" value={thigh} onChange={(e) => setThigh(e.target.value)} />
        </label>
        <label className="block"><span className="label">Arm (cm)</span>
          <input className="input" type="number" step="0.1" min="1" max="300" value={arm} onChange={(e) => setArm(e.target.value)} />
        </label>
        <label className="block col-span-2 sm:col-span-6">
          <span className="label">Note</span>
          <input className="input" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="col-span-2 sm:col-span-6">
          <button className="btn-primary" disabled={pending}>Save</button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-2">History</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No measurements yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th><th>Waist</th><th>Chest</th><th>Hips</th><th>Thigh</th><th>Arm</th><th>Note</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.entry_date)}</td>
                  <td>{r.waist_cm ? round1(r.waist_cm) : '—'}</td>
                  <td>{r.chest_cm ? round1(r.chest_cm) : '—'}</td>
                  <td>{r.hips_cm  ? round1(r.hips_cm)  : '—'}</td>
                  <td>{r.thigh_cm ? round1(r.thigh_cm) : '—'}</td>
                  <td>{r.arm_cm   ? round1(r.arm_cm)   : '—'}</td>
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
