'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';

type User = {
  id: number; email: string; name: string; role: 'user' | 'admin' | string;
  sex: string | null; age: number | null; height_cm: string | null;
  activity_level: string | null;
};

function csrf() {
  const m = document.cookie.match(/(?:^|;\s*)weightloss_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export function ProfileClient({ user }: { user: User }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [sex, setSex] = useState(user.sex || '');
  const [age, setAge] = useState(user.age?.toString() || '');
  const [height, setHeight] = useState(user.height_cm?.toString() || '');
  const [activity, setActivity] = useState(user.activity_level || '');
  const [pending, startTransition] = useTransition();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body: Record<string, unknown> = { name };
      if (sex !== user.sex) body.sex = sex || null;
      if (age !== (user.age?.toString() || '')) body.age = age ? Number(age) : null;
      if (height !== (user.height_cm?.toString() || '')) body.height_cm = height ? Number(height) : null;
      if (activity !== (user.activity_level || '')) body.activity_level = activity || null;

      const res = await fetch('/api/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf() },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast('ok', 'Profile updated');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  return (
    <form onSubmit={save} className="card max-w-lg space-y-3">
      <label className="block">
        <span className="label">Name</span>
        <input className="input" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="label">Sex</span>
          <select className="input" value={sex} onChange={(e) => setSex(e.target.value)}>
            <option value="">Not set</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Age</span>
          <input className="input" type="number" min="0" max="130" value={age} onChange={(e) => setAge(e.target.value)} />
        </label>
      </div>
      <label className="block">
        <span className="label">Height (cm)</span>
        <input className="input" type="number" step="0.1" min="1" max="300" value={height} onChange={(e) => setHeight(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Activity level</span>
        <select className="input" value={activity} onChange={(e) => setActivity(e.target.value)}>
          <option value="">Not set</option>
          <option value="sedentary">Sedentary</option>
          <option value="light">Lightly active</option>
          <option value="moderate">Moderately active</option>
          <option value="active">Active</option>
          <option value="very_active">Very active</option>
        </select>
      </label>
      <div>
        <p className="text-xs text-muted mb-2">Email: {user.email} (cannot be changed here)</p>
        <button className="btn-primary" disabled={pending}>Save profile</button>
      </div>
    </form>
  );
}
