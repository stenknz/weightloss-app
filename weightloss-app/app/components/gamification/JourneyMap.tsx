'use client';

import { MapPin } from 'lucide-react';

const MILESTONES = [
  { km: 0, name: 'Cape Reinga' }, { km: 100, name: 'Kaitaia' },
  { km: 400, name: 'Auckland' }, { km: 550, name: 'Hamilton' },
  { km: 700, name: 'Taupō' }, { km: 1100, name: 'Wellington' },
  { km: 1150, name: 'Cook Strait' }, { km: 1800, name: 'Christchurch' },
  { km: 2500, name: 'Dunedin' }, { km: 3000, name: 'Bluff' },
];

interface Props {
  progressKm: number;
  currentMilestone: string | null;
  completed: boolean;
  totalDistanceKm?: number;
}

export function JourneyMap({ progressKm, currentMilestone, completed, totalDistanceKm = 3000 }: Props) {
  const pct = Math.min(100, (progressKm / totalDistanceKm) * 100);
  return (
    <div className="card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Walk across New Zealand</h3>
        <span className="text-sm font-bold" style={{ color: 'rgb(var(--accent))' }}>
          {Math.round(progressKm)} / {totalDistanceKm} km
        </span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden mb-4" style={{ background: 'rgb(var(--border))' }}>
        <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      {completed && (
        <div className="text-center py-2 mb-3 rounded-lg bg-green-500/20 text-green-500 font-semibold text-sm">
          🏆 Journey Complete! You walked across New Zealand!
        </div>
      )}
      <div className="space-y-0 max-h-48 overflow-y-auto">
        {MILESTONES.map((m, i) => {
          const reached = progressKm >= m.km;
          return (
            <div key={m.name} className="flex items-center gap-3 py-1.5">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${reached ? 'bg-blue-500' : 'bg-gray-600'}`} />
                {i < MILESTONES.length - 1 && <div className="w-0.5 h-4 bg-gray-600" />}
              </div>
              <div className={`text-sm ${reached ? 'font-semibold' : ''}`} style={{ color: reached ? 'rgb(var(--accent))' : 'rgb(var(--muted))' }}>
                {m.name} <span className="text-xs">({m.km} km)</span>
                {currentMilestone === m.name && <MapPin size={12} className="inline ml-1 text-blue-500" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
