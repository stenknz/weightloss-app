'use client';

import { useState } from 'react';
import { toast } from '@/components/Providers';
import { Download } from 'lucide-react';

export default function ExportPage() {
  const [busy, setBusy] = useState(false);

  async function download(format: 'json' | 'csv') {
    setBusy(true);
    try {
      const res = await fetch(`/api/export?format=${format}`, { credentials: 'include' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Export failed');
      }
      const blob = await res.blob();
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
