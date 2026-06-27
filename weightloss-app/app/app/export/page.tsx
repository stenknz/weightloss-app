'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/components/Providers';
import { Download } from 'lucide-react';
import { exportUserData } from '@/lib/actions/export';

export default function ExportPage() {
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = 'Export Data — Weight Loss'; }, []);

  async function download(format: 'json' | 'csv') {
    setBusy(true);
    try {
      const r = await exportUserData(format);
      if ('error' in r && r.error) throw new Error(r.error);
      if (!('data' in r)) throw new Error('Unexpected response');
      const blob = r.format === 'csv'
        ? new Blob([csvSerialize(r.data as Record<string, unknown[]>)], { type: 'text/csv; charset=utf-8' })
        : new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weightloss-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast('ok', 'Download started');
    } catch (e) { toast('err', (e as Error).message); }
    setBusy(false);
  }

  return (
    <div className="space-y-3 max-w-lg">
      <h1 className="text-2xl font-bold">Export your data</h1>
      <div className="card space-y-2">
        <p className="text-sm text-muted">
          Download all your data in JSON or CSV format. Includes weigh-ins,
          measurements, food logs, exercise logs, water, steps, notes, and photos metadata.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn" disabled={busy} onClick={() => download('json')}>
            <Download size={14} /> Export as JSON
          </button>
          <button className="btn" disabled={busy} onClick={() => download('csv')}>
            <Download size={14} /> Export as CSV
          </button>
        </div>
      </div>
    </div>
  );
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvSerialize(tables: Record<string, unknown[]>): string {
  const lines: string[] = [];
  for (const t of Object.keys(tables)) {
    const rows = tables[t] as Record<string, unknown>[];
    lines.push(`## ${t}`);
    if (rows.length === 0) { lines.push(''); continue; }
    const cols = Object.keys(rows[0]);
    lines.push(cols.map(csvEscape).join(','));
    for (const r of rows) {
      lines.push(cols.map((c) => csvEscape(r[c])).join(','));
    }
    lines.push('');
  }
  return lines.join('\n');
}
