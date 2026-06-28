'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';
import { Scale, Utensils, Dumbbell, Droplet, Footprints, NotebookText } from 'lucide-react';
import { createFood } from '@/lib/actions/food';
import { createWater } from '@/lib/actions/water';
import { createWeighIn } from '@/lib/actions/weigh-in';
import { createExercise } from '@/lib/actions/exercise';
import { createSteps } from '@/lib/actions/steps';
import { createNote } from '@/lib/actions/notes';

type Tab = 'weight' | 'food' | 'exercise' | 'water' | 'steps' | 'note';

export function QuickLog({ date }: { date: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('weight');
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-3">
        <TabBtn current={tab} value="weight"   Icon={Scale}       label="Weight"   onSelect={setTab} />
        <TabBtn current={tab} value="food"     Icon={Utensils}    label="Food"     onSelect={setTab} />
        <TabBtn current={tab} value="exercise" Icon={Dumbbell}    label="Exercise" onSelect={setTab} />
        <TabBtn current={tab} value="water"    Icon={Droplet}     label="Water"    onSelect={setTab} />
        <TabBtn current={tab} value="steps"    Icon={Footprints}  label="Steps"    onSelect={setTab} />
        <TabBtn current={tab} value="note"     Icon={NotebookText} label="Note"     onSelect={setTab} />
      </div>

      {tab === 'weight'   && <WeightForm   date={date} pending={pending} onSaved={() => startTransition(() => router.refresh())} />}
      {tab === 'food'     && <FoodForm     date={date} pending={pending} onSaved={() => startTransition(() => router.refresh())} />}
      {tab === 'exercise' && <ExerciseForm date={date} pending={pending} onSaved={() => startTransition(() => router.refresh())} />}
      {tab === 'water'    && <WaterForm    date={date} pending={pending} onSaved={() => startTransition(() => router.refresh())} />}
      {tab === 'steps'    && <StepsForm    date={date} pending={pending} onSaved={() => startTransition(() => router.refresh())} />}
      {tab === 'note'     && <NoteForm     date={date} pending={pending} onSaved={() => startTransition(() => router.refresh())} />}
    </div>
  );
}

function TabBtn({ current, value, Icon, label, onSelect }:
  { current: Tab; value: Tab; Icon: React.ComponentType<{ size?: string | number }>; label: string; onSelect: (t: Tab) => void }) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={'btn ' + (active ? 'bg-accent text-accent-fg border-accent' : '')}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

function WeightForm({ date, pending, onSaved }: any) {
  const [kg, setKg] = useState('');
  const [note, setNote] = useState('');
  return (
    <form
      className="grid grid-cols-1 sm:grid-cols-3 gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const w = Number(kg);
        if (!Number.isFinite(w) || w < 20) { toast('err', 'Enter a valid weight (min 20 kg)'); return; }
        try {
          const result = await createWeighIn({ entry_date: date, weight_kg: w, note: note || null });
          if (result.error) { toast('err', result.error); return; }
          setKg(''); setNote('');
          toast('ok', 'Weigh-in saved');
          onSaved();
        } catch (e) { toast('err', (e as Error).message); }
      }}
    >
      <label className="block">
        <span className="label">Weight (kg)</span>
        <input className="input" type="number" step="0.1" min="20" max="500" required
               value={kg} onChange={(e) => setKg(e.target.value)} />
      </label>
      <label className="block sm:col-span-2">
        <span className="label">Note (optional)</span>
        <input className="input" maxLength={1000}
               value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="sm:col-span-3">
        <button className="btn-primary" disabled={pending}>Save weigh-in</button>
      </div>
    </form>
  );
}

function FoodForm({ date, pending, onSaved }: any) {
  const [meal, setMeal] = useState('lunch');
  const [desc, setDesc] = useState('');
  const [cal, setCal] = useState('');
  const [p, setP] = useState('');
  const [c, setC] = useState('');
  const [f, setF] = useState('');
  const [fibre, setFibre] = useState('');
  const [sugar, setSugar] = useState('');
  const num = (v: string) => v === '' ? null : Number(v);
  return (
    <form
      className="grid grid-cols-2 sm:grid-cols-6 gap-2"
      onSubmit={async (e) => {
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
          setDesc(''); setCal(''); setP(''); setC(''); setF(''); setFibre(''); setSugar('');
          toast('ok', 'Food entry saved');
          onSaved();
        } catch (e) { toast('err', (e as Error).message); }
      }}
    >
      <label className="block col-span-2 sm:col-span-1">
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
      <label className="block">
        <span className="label">kcal</span>
        <input className="input" type="number" min="0" step="1" required value={cal} onChange={(e) => setCal(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">P (g)</span>
        <input className="input" type="number" min="0" step="0.1" value={p} onChange={(e) => setP(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">C (g)</span>
        <input className="input" type="number" min="0" step="0.1" value={c} onChange={(e) => setC(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">F (g)</span>
        <input className="input" type="number" min="0" step="0.1" value={f} onChange={(e) => setF(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Fibre (g)</span>
        <input className="input" type="number" min="0" step="0.1" value={fibre} onChange={(e) => setFibre(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Sugar (g)</span>
        <input className="input" type="number" min="0" step="0.1" value={sugar} onChange={(e) => setSugar(e.target.value)} />
      </label>
      <div className="col-span-2 sm:col-span-6">
        <button className="btn-primary" disabled={pending}>Save food entry</button>
      </div>
    </form>
  );
}

function ExerciseForm({ date, pending, onSaved }: any) {
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState('');
  const [burned, setBurned] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <form
      className="grid grid-cols-2 sm:grid-cols-4 gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!activity.trim()) { toast('err', 'Activity is required'); return; }
        const num = (v: string) => v === '' ? null : Number(v);
        try {
          const result = await createExercise({
            entry_date: date, activity,
            duration_min: num(duration),
            calories_burned: num(burned),
            notes: notes || null
          });
          if (result.error) { toast('err', result.error); return; }
          setActivity(''); setDuration(''); setBurned(''); setNotes('');
          toast('ok', 'Exercise saved');
          onSaved();
        } catch (e) { toast('err', (e as Error).message); }
      }}
    >
      <label className="block col-span-2">
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
        <button className="btn-primary" disabled={pending}>Save exercise</button>
      </div>
    </form>
  );
}

function WaterForm({ date, pending, onSaved }: any) {
  const [ml, setMl] = useState('250');
  return (
    <form
      className="grid grid-cols-2 sm:grid-cols-4 gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const n = Number(ml);
        if (!Number.isFinite(n) || n <= 0) { toast('err', 'Enter a valid amount'); return; }
        try {
          const result = await createWater({ entry_date: date, amount_ml: Math.round(n) });
          if (result.error) { toast('err', result.error); return; }
          setMl('250');
          toast('ok', 'Water logged');
          onSaved();
        } catch (e) { toast('err', (e as Error).message); }
      }}
    >
      <label className="block col-span-2">
        <span className="label">Amount (ml)</span>
        <input className="input" type="number" min="1" max="10000" required value={ml} onChange={(e) => setMl(e.target.value)} />
      </label>
      <div className="col-span-2 sm:col-span-4 flex gap-2">
        {[250, 500, 750, 1000].map((v) => (
          <button key={v} type="button" className="btn" onClick={() => setMl(String(v))}>{v} ml</button>
        ))}
        <button className="btn-primary" disabled={pending}>Add</button>
      </div>
    </form>
  );
}

function StepsForm({ date, pending, onSaved }: any) {
  const [steps, setSteps] = useState('');
  return (
    <form
      className="grid grid-cols-2 sm:grid-cols-3 gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const n = Number(steps);
        if (!Number.isFinite(n) || n < 0) { toast('err', 'Enter a valid step count'); return; }
        try {
          const result = await createSteps({ entry_date: date, steps: Math.round(n) });
          if (result.error) { toast('err', result.error); return; }
          setSteps('');
          toast('ok', 'Steps saved');
          onSaved();
        } catch (e) { toast('err', (e as Error).message); }
      }}
    >
      <label className="block col-span-2 sm:col-span-2">
        <span className="label">Steps</span>
        <input className="input" type="number" min="0" max="200000" required value={steps} onChange={(e) => setSteps(e.target.value)} />
      </label>
      <div className="col-span-2 sm:col-span-3">
        <button className="btn-primary" disabled={pending}>Save steps</button>
      </div>
    </form>
  );
}

function NoteForm({ date, pending, onSaved }: any) {
  const [body, setBody] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!body.trim()) { toast('err', 'Note cannot be empty'); return; }
        try {
          const r = await createNote({ entry_date: date, body });
          if (r.error) throw new Error(r.error);
          setBody('');
          toast('ok', 'Note saved');
          onSaved();
        } catch (e) { toast('err', (e as Error).message); }
      }}
    >
      <label className="block">
        <span className="label">Note for {date}</span>
        <textarea className="input" rows={4} required maxLength={20000} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <div className="mt-2">
        <button className="btn-primary" disabled={pending}>Save note</button>
      </div>
    </form>
  );
}
