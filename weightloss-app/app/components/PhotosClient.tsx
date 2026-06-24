'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './Providers';
import { fmtDate, todayISO } from '@/lib/utils';

type Row = {
  id: number; entry_date: string; filename: string;
  original_name: string | null; mime_type: string | null;
  size_bytes: number; caption: string | null;
};

function csrf() {
  const m = document.cookie.match(/(?:^|;\s*)weightloss_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

export function PhotosClient({ initial, maxMb }: { initial: Row[]; maxMb: number }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [date, setDate] = useState(todayISO());
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast('err', 'Choose a file first'); return; }
    if (file.size > maxMb * 1024 * 1024) { toast('err', `File too large (max ${maxMb} MB)`); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('date', date);
      if (caption) fd.append('caption', caption);
      const res = await fetch('/api/photos', {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-csrf-token': csrf() },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setRows((prev) => [{
        id: data.id, entry_date: date, filename: data.filename,
        original_name: file.name, mime_type: file.type,
        size_bytes: data.size, caption: caption || null
      }, ...prev]);
      setFile(null); setCaption('');
      toast('ok', 'Uploaded');
      startTransition(() => router.refresh());
    } catch (e) {
      toast('err', (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this photo?')) return;
    try {
      const res = await fetch(`/api/photos/${id}`, {
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

  // Group by date
  const byDate = new Map<string, Row[]>();
  for (const r of rows) {
    const arr = byDate.get(r.entry_date) || [];
    arr.push(r);
    byDate.set(r.entry_date, arr);
  }
  const dates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-3">
      <form onSubmit={upload} className="card grid grid-cols-1 sm:grid-cols-4 gap-2">
        <label className="block">
          <span className="label">Date</span>
          <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Image (max {maxMb} MB)</span>
          <input className="input" type="file" required accept="image/jpeg,image/png,image/webp"
                 onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <label className="block">
          <span className="label">Caption</span>
          <input className="input" maxLength={500} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </label>
        <div className="sm:col-span-4">
          <button className="btn-primary" disabled={uploading || pending}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </form>

      {dates.length === 0 ? (
        <div className="card text-sm text-muted text-center py-8">No photos yet.</div>
      ) : (
        dates.map((d) => (
          <div key={d} className="card">
            <h2 className="font-semibold mb-2">{fmtDate(d)}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {byDate.get(d)!.map((p) => (
                <div key={p.id} className="card-tight">
                  <a href={`/api/photos/${p.id}/file`} target="_blank" rel="noreferrer">
                    <img
                      src={`/api/photos/${p.id}/file`}
                      alt={p.caption || p.original_name || 'photo'}
                      className="w-full h-32 object-cover rounded"
                      loading="lazy"
                    />
                  </a>
                  {p.caption && <div className="text-xs mt-1 text-muted truncate">{p.caption}</div>}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted">{Math.round(p.size_bytes / 1024)} KB</span>
                    <button className="btn-danger !py-0.5 !px-1.5 text-xs" onClick={() => remove(p.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
