'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';

export function RegisterForm({ inviteCode }: { inviteCode?: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState(inviteCode || '');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) { toast('err', 'Password must be at least 10 characters'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password, invite_code: code })
      });
      const data = await res.json();
      if (!res.ok) { toast('err', data.error || 'Registration failed'); setBusy(false); return; }
      toast('ok', `Account created for ${data.user.name}`);
      router.push('/');
      router.refresh();
    } catch (e) {
      toast('err', (e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="label">Name</span>
        <input className="input" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Email</span>
        <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Password (min 10 chars, letter + number/symbol)</span>
        <input className="input" type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Invite code</span>
        <input className="input" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
      </label>
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? 'Creating…' : 'Create account'}
      </button>
    </form>
  );
}
