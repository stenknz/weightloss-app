'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';
import { login } from '@/lib/actions/auth';

export function LoginForm({ next, invite }: { next?: string; invite?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(invite ? '' : '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await login({ email, password });
      if ('error' in result) {
        toast('err', result.error);
        setBusy(false);
        return;
      }
      toast('ok', `Welcome, ${result.user.name}`);
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
