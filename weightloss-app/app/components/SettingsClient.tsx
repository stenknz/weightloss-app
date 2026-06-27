'use client';

import { useState } from 'react';
import { toast } from './Providers';
import { changePassword } from '@/lib/actions/auth';

export function SettingsClient() {
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [busy, setBusy] = useState(false);

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 10) { toast('err', 'New password must be at least 10 characters'); return; }
    setBusy(true);
    try {
      const result = await changePassword({ current_password: current, new_password: newPw });
      if (result.error) throw new Error(result.error);
      toast('ok', 'Password changed. You will need to sign in again.');
      setCurrent(''); setNewPw('');
    } catch (e) { toast('err', (e as Error).message); }
    setBusy(false);
  }

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">Change password</h2>
      <form onSubmit={onChangePassword} className="space-y-3">
        <label className="block">
          <span className="label">Current password</span>
          <input className="input" type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">New password (min 10 chars, letter + number/symbol)</span>
          <input className="input" type="password" required minLength={10} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
        </label>
        <button className="btn-primary" disabled={busy}>Change password</button>
      </form>

      <hr className="border-border" />
      <p className="text-xs text-muted">
        Other settings (units, notifications) coming soon.
      </p>
    </div>
  );
}
