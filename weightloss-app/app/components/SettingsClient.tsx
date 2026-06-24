'use client';

import { useState } from 'react';
import { toast } from './Providers';

function csrf() {
  const m = document.cookie.match(/(?:^|;\s*)weightloss_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export function SettingsClient() {
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [busy, setBusy] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 10) { toast('err', 'New password must be at least 10 characters'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf() },
        body: JSON.stringify({ current_password: current, new_password: newPw })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast('ok', 'Password changed. You will need to sign in again.');
      setCurrent(''); setNewPw('');
    } catch (e) { toast('err', (e as Error).message); }
    setBusy(false);
  }

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">Change password</h2>
      <form onSubmit={changePassword} className="space-y-3">
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
