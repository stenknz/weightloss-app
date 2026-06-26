'use client';

import { WeightChart } from './WeightChart';
import { MeasureChart } from './MeasureChart';
import type { WeightPoint } from './WeightChart';
import type { MeasurePoint } from './MeasureChart';

export function ProgressClient({
  weightData, measureData, targetKg
}: {
  weightData: WeightPoint[]; measureData: MeasurePoint[]; targetKg: number | null;
}) {
  const hasWeight = weightData.length > 0;
  const hasMeasures = measureData.length > 0;

  if (!hasWeight && !hasMeasures) {
    return (
      <div className="card text-sm text-center py-8" style={{ color: 'rgb(var(--muted))' }}>
        No progress data yet. Log some weigh-ins and measurements.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasWeight && (
        <div className="card">
          <h2 className="font-semibold text-sm mb-2" style={{ color: 'rgb(var(--text))' }}>Weight Trend</h2>
          <WeightChart data={weightData} targetKg={targetKg} />
        </div>
      )}

      {hasMeasures && (
        <div className="card">
          <h2 className="font-semibold text-sm mb-2" style={{ color: 'rgb(var(--text))' }}>Measurements Over Time</h2>
          <MeasureChart data={measureData} />
        </div>
      )}

      {hasMeasures && (
        <div className="card overflow-x-auto">
          <h2 className="font-semibold text-sm mb-2" style={{ color: 'rgb(var(--text))' }}>Measurement History</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th><th>Waist</th><th>Chest</th><th>Hips</th><th>Thigh</th><th>Arm</th>
              </tr>
            </thead>
            <tbody>
              {measureData.map((r) => (
                <tr key={r.date}>
                  <td>{r.date}</td>
                  <td>{r.waist ?? '—'}</td>
                  <td>{r.chest ?? '—'}</td>
                  <td>{r.hips  ?? '—'}</td>
                  <td>{r.thigh ?? '—'}</td>
                  <td>{r.arm   ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
