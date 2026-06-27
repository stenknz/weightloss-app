'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';
import { adminGetSettings, adminUpdateSettings } from '@/lib/actions/admin';

type Settings = { invite_only: boolean; app_name: string };

export function AdminSettingsClient() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({ invite_only: true, app_name: 'Weight Loss' });
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    adminGetSettings().then((r) => {
      if ('data' in r && r.data) { setSettings(r.data); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await adminUpdateSettings(settings);
    if ('error' in r && r.error) { toast('err', r.error); return; }
    toast('ok', 'Settings saved');
    startTransition(() => router.refresh());
  }

  if (loading) return <div className="card text-sm text-muted">Loading…</div>;

  return (
    <form onSubmit={save} className="card max-w-lg space-y-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.invite_only}
          onChange={(e) => setSettings({ ...settings, invite_only: e.target.checked })}
          className="rounded border-border"
        />
        <span className="text-sm">Invite-only registration</span>
      </label>
      <p className="text-xs text-muted">
        When enabled, new users need an invite code to register.
        When disabled, anyone with the URL can create an account.
      </p>
      <label className="block">
        <span className="label">App name</span>
        <input className="input" maxLength={64} value={settings.app_name} onChange={(e) => setSettings({ ...settings, app_name: e.target.value })} />
      </label>
      <button className="btn-primary" disabled={pending}>Save settings</button>
    </form>
  );
}
