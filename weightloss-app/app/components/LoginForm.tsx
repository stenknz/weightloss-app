'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';

function csrf() {
  const m = document.cookie.match(/(?:^|;\s*)weightloss_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export function LoginForm({ next, invite }: { next?: string; invite?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(invite ? '' : '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        toast('err', data.error || 'Login failed');
        setBusy(false);
        return;
      }
      toast('ok', `Welcome, ${data.user.name}`);
      router.push(next || '/');
      router.refresh();
    } catch (e) {
      toast('err', (e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="label">Email</span>
        <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
