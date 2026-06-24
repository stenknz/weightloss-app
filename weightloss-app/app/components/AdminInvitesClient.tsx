'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';

type Row = { id: number; code: string; email: string | null; note: string | null; max_uses: number; uses: number; expires_at: Date | null; created_at: Date; created_by_email: string | null; used_by_email: string | null };

function csrf() {
  const m = document.cookie.match(/(?:^|;\s*)weightloss_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export function AdminInvitesClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [maxUses, setMaxUses] = useState('1');
  const [expDays, setExpDays] = useState('30');
  const [newCode, setNewCode] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf() },
        body: JSON.stringify({
          email: email || null,
          note: note || null,
          max_uses: Math.max(1, Number(maxUses) || 1),
          expires_in_days: expDays ? Math.max(1, Number(expDays)) : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setNewCode(data.code);
      setEmail(''); setNote('');
      toast('ok', 'Invite created');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  async function remove(id: number) {
    if (!confirm('Delete this invite?')) return;
    try {
      const res = await fetch(`/api/admin/invites/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-csrf-token': csrf() }
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Delete failed');
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast('ok', 'Deleted');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={create} className="card grid grid-cols-2 sm:grid-cols-4 gap-2">
        <label className="block">
          <span className="label">Email (optional)</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Note</span>
          <input className="input" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Max uses</span>
          <input className="input" type="number" min="1" max="100" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Expires (days)</span>
          <input className="input" type="number" min="1" max="365" value={expDays} onChange={(e) => setExpDays(e.target.value)} />
        </label>
        <div className="col-span-2 sm:col-span-4">
          <button className="btn-primary" disabled={pending}>Generate invite</button>
        </div>
      </form>

      {newCode && (
        <div className="card-tight border-accent/40 bg-accent/5">
          <div className="text-sm font-medium mb-1">New invite code created:</div>
          <div className="text-lg font-bold text-accent select-all">{newCode}</div>
          <div className="text-xs text-muted mt-1">
            Share this link with the new user:
            {process.env.NEXT_PUBLIC_URL || window.location.origin}/invite/{encodeURIComponent(newCode)}
          </div>
          <button className="btn mt-2 !py-0.5 text-xs" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/invite/${encodeURIComponent(newCode)}`); toast('ok', 'Copied'); }}>
            Copy link
          </button>
        </div>
      )}

      <div className="card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No invite codes yet. Generate one above.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Code</th><th>Email</th><th>Uses</th><th>Expires</th><th>Created by</th><th>Used by</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.code}</td>
                  <td>{r.email || '—'}</td>
                  <td>{r.uses}/{r.max_uses}</td>
                  <td>{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : 'Never'}</td>
                  <td className="text-muted">{r.created_by_email}</td>
                  <td>{r.used_by_email || '—'}</td>
                  <td><button className="btn-danger !py-0.5 !px-1.5 text-xs" onClick={() => remove(r.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
