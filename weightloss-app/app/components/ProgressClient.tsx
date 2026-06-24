'use client';

import { WeightChart } from './WeightChart';
import type { WeightPoint } from './WeightChart';

type MeasurePoint = { date: string; waist: number | null; chest: number | null; hips: number | null; thigh: number | null; arm: number | null };

export function ProgressClient({
  weightData, measureData, targetKg
}: {
  weightData: WeightPoint[]; measureData: MeasurePoint[]; targetKg: number | null;
}) {
  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-semibold mb-2">Weight Trend</h2>
        <WeightChart data={weightData} targetKg={targetKg} />
      </div>

      {measureData.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-2">Measurements</h2>
          {measureData.length > 0 && (
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
          )}
        </div>
      )}

      {weightData.length === 0 && measureData.length === 0 && (
        <div className="card text-sm text-muted text-center py-8">
          No progress data yet. Log some weigh-ins and measurements.
        </div>
      )}
    </div>
  );
}
