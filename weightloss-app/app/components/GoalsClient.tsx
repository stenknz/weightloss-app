'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';
import { updateGoals } from '@/lib/actions/goals';

type Goals = {
  target_weight_kg: string | null; target_calorie_deficit: number | null;
  target_date: string | null; calorie_target: number | null;
  protein_target_g: number | null; carbs_target_g: number | null; fat_target_g: number | null;
  water_target_ml: number | null;
};

export function GoalsClient({ initial }: { initial: Goals }) {
  const router = useRouter();
  const [tw, setTw] = useState(initial.target_weight_kg || '');
  const [deficit, setDeficit] = useState(initial.target_calorie_deficit?.toString() || '');
  const [tdate, setTdate] = useState(initial.target_date || '');
  const [cal, setCal] = useState(initial.calorie_target?.toString() || '');
  const [p, setP] = useState(initial.protein_target_g?.toString() || '');
  const [c, setC] = useState(initial.carbs_target_g?.toString() || '');
  const [f, setF] = useState(initial.fat_target_g?.toString() || '');
  const [water, setWater] = useState(initial.water_target_ml?.toString() || '');
  const [pending, startTransition] = useTransition();
  const num = (v: string) => v === '' ? null : Number(v);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await updateGoals({
        target_weight_kg: num(tw), target_calorie_deficit: num(deficit),
        target_date: tdate || null,
        calorie_target: num(cal), protein_target_g: num(p),
        carbs_target_g: num(c), fat_target_g: num(f),
        water_target_ml: water ? Math.round(Number(water)) : null,
      });
      if (result.error) throw new Error(result.error);
      toast('ok', 'Goals updated');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  return (
    <form onSubmit={save} className="card grid grid-cols-2 sm:grid-cols-4 gap-2">
      <label className="block"><span className="label">Target weight (kg)</span>
        <input className="input" type="number" step="0.1" min="1" max="500" value={tw} onChange={(e) => setTw(e.target.value)} />
      </label>
      <label className="block"><span className="label">Daily deficit (kcal)</span>
        <input className="input" type="number" min="0" max="5000" value={deficit} onChange={(e) => setDeficit(e.target.value)} />
      </label>
      <label className="block"><span className="label">Target date</span>
        <input className="input" type="date" value={tdate} onChange={(e) => setTdate(e.target.value)} />
      </label>
      <label className="block"><span className="label">Calorie target</span>
        <input className="input" type="number" min="0" max="20000" value={cal} onChange={(e) => setCal(e.target.value)} />
      </label>
      <label className="block"><span className="label">Protein (g)</span>
        <input className="input" type="number" min="0" max="1000" value={p} onChange={(e) => setP(e.target.value)} />
      </label>
      <label className="block"><span className="label">Carbs (g)</span>
        <input className="input" type="number" min="0" max="2000" value={c} onChange={(e) => setC(e.target.value)} />
      </label>
      <label className="block"><span className="label">Fat (g)</span>
        <input className="input" type="number" min="0" max="500" value={f} onChange={(e) => setF(e.target.value)} />
      </label>
      <label className="block"><span className="label">Water target (L)</span>
        <input className="input" type="number" min="0.5" max="15" step="0.1"
          value={Number(water) / 1000 || ''} onChange={(e) => setWater(e.target.value ? String(Math.round(Number(e.target.value) * 1000)) : '')} />
      </label>
      <div className="col-span-2 sm:col-span-4">
        <button className="btn-primary" disabled={pending}>Save goals</button>
      </div>
    </form>
  );
}
