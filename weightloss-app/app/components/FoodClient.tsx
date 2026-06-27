'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';
import { fmtDate, round0, todayISO } from '@/lib/utils';
import { createFood, deleteFood } from '@/lib/actions/food';

type Row = {
  id: number; entry_date: string; meal: string | null; description: string;
  calories: string; protein_g: string | null; carbs_g: string | null; fat_g: string | null;
  fibre_g: string | null; sugar_g: string | null;
};

export function FoodClient({ initial, targets }:
  { initial: Row[]; targets: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null } }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [date, setDate] = useState(todayISO());
  const [meal, setMeal] = useState('lunch');
  const [desc, setDesc] = useState('');
  const [cal, setCal] = useState('');
  const [p, setP] = useState('');
  const [c, setC] = useState('');
  const [f, setF] = useState('');
  const [fibre, setFibre] = useState('');
  const [sugar, setSugar] = useState('');
  const [pending, startTransition] = useTransition();
  const num = (v: string) => v === '' ? null : Number(v);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!desc.trim()) { toast('err', 'Description is required'); return; }
    const calN = Number(cal);
    if (!Number.isFinite(calN) || calN < 0) { toast('err', 'Enter valid calories'); return; }
    try {
      const result = await createFood({
        entry_date: date, meal, description: desc, calories: calN,
        protein_g: num(p), carbs_g: num(c), fat_g: num(f),
        fibre_g: num(fibre), sugar_g: num(sugar),
      });
      if (result.error) { toast('err', result.error); return; }
      const updated: Row = {
        id: result.id!, entry_date: date, meal, description: desc,
        calories: String(calN),
        protein_g: p || null, carbs_g: c || null, fat_g: f || null,
        fibre_g: fibre || null, sugar_g: sugar || null
      };
      setRows((prev) => [updated, ...prev]);
      setDesc(''); setCal(''); setP(''); setC(''); setF(''); setFibre(''); setSugar('');
      toast('ok', 'Saved');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  async function remove(id: number) {
    if (!confirm('Delete this food entry?')) return;
    try {
      const result = await deleteFood(id);
      if (result.error) { toast('err', result.error); return; }
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast('ok', 'Deleted');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  // Today's totals
  const todayTotals = rows
    .filter((r) => r.entry_date === date)
    .reduce(
      (s, r) => ({
        calories: s.calories + Number(r.calories || 0),
        protein:  s.protein  + Number(r.protein_g || 0),
        carbs:    s.carbs    + Number(r.carbs_g   || 0),
        fat:      s.fat      + Number(r.fat_g     || 0),
        fibre:    s.fibre    + Number(r.fibre_g   || 0),
        sugar:    s.sugar    + Number(r.sugar_g   || 0)
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0 }
    );

  return (
    <div className="space-y-3">
      <form onSubmit={save} className="card grid grid-cols-2 sm:grid-cols-6 gap-2">
        <label className="block col-span-2 sm:col-span-1">
          <span className="label">Date</span>
          <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Meal</span>
          <select className="input" value={meal} onChange={(e) => setMeal(e.target.value)}>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </label>
        <label className="block col-span-2 sm:col-span-2">
          <span className="label">Description</span>
          <input className="input" required maxLength={500} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </label>
        <label className="block"><span className="label">kcal</span>
          <input className="input" type="number" min="0" step="1" required value={cal} onChange={(e) => setCal(e.target.value)} />
        </label>
        <label className="block"><span className="label">P (g)</span>
          <input className="input" type="number" min="0" step="0.1" value={p} onChange={(e) => setP(e.target.value)} />
        </label>
        <label className="block"><span className="label">C (g)</span>
          <input className="input" type="number" min="0" step="0.1" value={c} onChange={(e) => setC(e.target.value)} />
        </label>
        <label className="block"><span className="label">F (g)</span>
          <input className="input" type="number" min="0" step="0.1" value={f} onChange={(e) => setF(e.target.value)} />
        </label>
        <label className="block"><span className="label">Fibre (g)</span>
          <input className="input" type="number" min="0" step="0.1" value={fibre} onChange={(e) => setFibre(e.target.value)} />
        </label>
        <label className="block"><span className="label">Sugar (g)</span>
          <input className="input" type="number" min="0" step="0.1" value={sugar} onChange={(e) => setSugar(e.target.value)} />
        </label>
        <div className="col-span-2 sm:col-span-6">
          <button className="btn-primary" disabled={pending}>Save</button>
        </div>
      </form>

      <div className="card grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
        <Progress label="Calories" value={todayTotals.calories} target={targets.calories} unit="kcal" />
        <Progress label="Protein"  value={todayTotals.protein}  target={targets.protein} unit="g" />
        <Progress label="Carbs"    value={todayTotals.carbs}    target={targets.carbs}   unit="g" />
        <Progress label="Fat"      value={todayTotals.fat}      target={targets.fat}     unit="g" />
        <Progress label="Fibre" value={todayTotals.fibre} target={null} unit="g" />
        <Progress label="Sugar" value={todayTotals.sugar} target={null} unit="g" />
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-2">History</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No food entries yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Meal</th><th>Description</th><th>kcal</th><th>P</th><th>C</th><th>F</th><th>Fibre</th><th>Sugar</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.entry_date)}</td>
                  <td className="capitalize text-muted">{r.meal || '—'}</td>
                  <td>{r.description}</td>
                  <td className="font-medium">{round0(r.calories)}</td>
                  <td>{r.protein_g ? round0(r.protein_g) : '—'}</td>
                  <td>{r.carbs_g   ? round0(r.carbs_g)   : '—'}</td>
                  <td>{r.fat_g     ? round0(r.fat_g)     : '—'}</td>
                  <td>{r.fibre_g ? round0(r.fibre_g) : '—'}</td>
                  <td>{r.sugar_g ? round0(r.sugar_g) : '—'}</td>
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

function Progress({ label, value, target, unit }: { label: string; value: number; target: number | null; unit: string }) {
  const pct = target && target > 0 ? Math.min(100, Math.round((value / target) * 100)) : null;
  return (
    <div>
      <div className="flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span>{Math.round(value)} / {target ?? '—'} {unit}</span>
      </div>
      <div className="h-2 mt-1 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-accent" style={{ width: pct == null ? '0%' : `${pct}%` }} />
      </div>
    </div>
  );
}
