'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';

type Row = {
  id: number; email: string; name: string; role: string;
  is_active: boolean; created_at: Date;
  weigh_ins: number; food_logs: number; photos: number;
  photo_storage_used_bytes: number;
};

function csrf() {
  const m = document.cookie.match(/(?:^|;\s*)weightloss_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export function AdminUsersClient({ initial, currentUserId }: { initial: Row[]; currentUserId: number }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [pending, startTransition] = useTransition();
  const [editId, setEditId] = useState<number | null>(null);
  const [passwordId, setPasswordId] = useState<number | null>(null);
  const [newPw, setNewPw] = useState('');

  async function toggleActive(id: number, active: boolean) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf() },
        body: JSON.stringify({ is_active: !active })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, is_active: !active } : r));
      toast('ok', `User ${!active ? 'enabled' : 'disabled'}`);
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  async function changeRole(id: number, role: string) {
    if (id === currentUserId && role === 'user') {
      toast('err', 'You cannot demote yourself');
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf() },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, role } : r));
      toast('ok', `Role changed to ${role}`);
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  async function setPassword(id: number) {
    if (newPw.length < 10) { toast('err', 'Password must be at least 10 characters'); return; }
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf() },
        body: JSON.stringify({ password: newPw })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setPasswordId(null); setNewPw('');
      toast('ok', 'Password reset');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  async function deleteUser(id: number) {
    if (id === currentUserId) { toast('err', 'You cannot delete yourself'); return; }
    if (!confirm('Delete this user and ALL their data? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-csrf-token': csrf() }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast('ok', 'User deleted');
      startTransition(() => router.refresh());
    } catch (e) { toast('err', (e as Error).message); }
  }

  return (
    <div className="card overflow-x-auto">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No users found.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Stats</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.name}</td>
                <td>{r.email}</td>
                <td>
                  <select
                    className="input !py-0.5 w-20"
                    value={r.role}
                    onChange={(e) => changeRole(r.id, e.target.value)}
                    disabled={r.id === currentUserId && r.role === 'admin'}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <span className={'badge ' + (r.is_active ? 'badge-good' : 'badge-bad')}>
                    {r.is_active ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="text-muted text-xs">
                  {r.weigh_ins} weigh | {r.food_logs} food | {r.photos} photos
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <button className="btn !py-0.5 !px-1.5 text-xs" onClick={() => toggleActive(r.id, r.is_active)}>
                      {r.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button className="btn !py-0.5 !px-1.5 text-xs" onClick={() => {
                      setPasswordId(r.id); setNewPw(''); setEditId(null);
                    }}>
                      Reset pw
                    </button>
                    {r.id !== currentUserId && (
                      <button className="btn-danger !py-0.5 !px-1.5 text-xs" onClick={() => deleteUser(r.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                  {passwordId === r.id && (
                    <div className="mt-1 flex gap-1">
                      <input className="input !py-0.5 text-xs" type="password" placeholder="New password" minLength={10}
                             value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                      <button className="btn-primary !py-0.5 !px-1.5 text-xs" onClick={() => setPassword(r.id)}>Set</button>
                      <button className="btn !py-0.5 !px-1.5 text-xs" onClick={() => setPasswordId(null)}>X</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
