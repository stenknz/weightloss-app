'use client';

import { useState, useEffect } from 'react';
import { getLeaderboardData } from '@/lib/actions/gamification';

const TABS = [
  { key: 'streak', label: 'Longest Streak' },
  { key: 'xp_week', label: 'XP This Week' },
  { key: 'challenges', label: 'Challenges' },
  { key: 'weight_loss', label: 'Weight Loss %' },
];

export function LeaderboardTable() {
  const [tab, setTab] = useState('streak');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLeaderboardData(tab).then(data => {
      setRows(data as any[]);
      setLoading(false);
    });
  }, [tab]);

  return (
    <div className="card rounded-xl p-4">
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-blue-500/20 text-blue-400 font-semibold' : 'hover:bg-white/5'
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="text-center py-4 text-sm" style={{ color: 'rgb(var(--muted))' }}>Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-4 text-sm" style={{ color: 'rgb(var(--muted))' }}>No data yet</div>
      ) : (
        <div className="space-y-1">
          {rows.slice(0, 10).map((r, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/5">
              <span className={`w-6 text-center text-sm font-bold ${i < 3 ? 'text-blue-400' : ''}`}>#{r.rank}</span>
              <span className="flex-1 text-sm">{r.displayName}</span>
              <span className="text-sm font-semibold" style={{ color: 'rgb(var(--accent))' }}>
                {tab === 'weight_loss' ? r.value + '%' : r.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="text-xs mt-2 text-center" style={{ color: 'rgb(var(--muted))' }}>Anonymous opt-in leaderboard</div>
    </div>
  );
}
