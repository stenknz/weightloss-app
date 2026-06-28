import { query } from '@/lib/db';

const MILESTONES = [
  { km: 0, name: 'Cape Reinga' }, { km: 100, name: 'Kaitaia' },
  { km: 400, name: 'Auckland' }, { km: 550, name: 'Hamilton' },
  { km: 700, name: 'Taupō' }, { km: 1100, name: 'Wellington' },
  { km: 1150, name: 'Cook Strait' }, { km: 1800, name: 'Christchurch' },
  { km: 2500, name: 'Dunedin' }, { km: 3000, name: 'Bluff' },
];

export async function updateJourney(userId: number): Promise<{ progressKm: number; currentMilestone: string | null; completed: boolean }> {
  const [weightData, streakData, userData] = await Promise.all([
    query('SELECT weight_kg FROM weigh_ins WHERE user_id = $1 ORDER BY entry_date ASC LIMIT 1', [userId]),
    query('SELECT current_count FROM streaks WHERE user_id = $1 AND streak_type = $2', [userId, 'logging']),
    query('SELECT weight_kg FROM weigh_ins WHERE user_id = $1 ORDER BY entry_date DESC LIMIT 1', [userId]),
  ]);

  const startWt = Number(weightData.rows[0]?.weight_kg ?? 0);
  const currentWt = Number(userData.rows[0]?.weight_kg ?? 0);
  const weightLost = startWt > 0 ? Math.max(0, startWt - currentWt) : 0;
  const streakDays = streakData.rows[0]?.current_count ?? 0;

  const progressKm = Math.min(3000, weightLost * 60 + streakDays * 5);

  let currentMilestone: string | null = null;
  for (const m of MILESTONES) {
    if (progressKm >= m.km) currentMilestone = m.name;
  }

  const completed = progressKm >= 3000;

  await query(
    `INSERT INTO journey_progress (user_id, journey_type, progress_km, current_milestone, completed, completed_at)
     VALUES ($1, 'nz_walk', $2, $3, $4, CASE WHEN $4 THEN now() ELSE NULL END)
     ON CONFLICT (user_id, journey_type) DO UPDATE SET
       progress_km = GREATEST(journey_progress.progress_km, $2),
       current_milestone = $3,
       completed = $4 OR journey_progress.completed,
       completed_at = CASE WHEN $4 AND NOT journey_progress.completed THEN now() ELSE journey_progress.completed_at END`,
    [userId, progressKm, currentMilestone, completed]
  );

  return { progressKm, currentMilestone, completed };
}
