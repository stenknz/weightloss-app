import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { todayISO, fmtDate, round1 } from '@/lib/utils';
import { parseISO, differenceInDays, subDays } from 'date-fns';
import Link from 'next/link';
import { Scale, Utensils, Dumbbell, Droplet, Footprints, ArrowRight } from 'lucide-react';
import { QuickLog } from '@/components/QuickLog';
import { WeightChart } from '@/components/WeightChart';
import { WeightRing } from '@/components/WeightRing';
import { WaterChart } from '@/components/WaterChart';
import { StepsChart } from '@/components/StepsChart';
import { CalorieChart } from '@/components/CalorieChart';
import { MacroChart } from '@/components/MacroChart';
import type { MacroData } from '@/components/MacroChart';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadDashboard(userId: number) {
  const today = todayISO();
  const thirtyDaysAgo = subDays(parseISO(today), 30).toISOString().slice(0, 10);

  const [
    latestW, todayFood, todayEx, todayWater, todaySteps,
    weightSeries, waterSeries, stepsSeries, foodSeries, exSeries, measureSeries
  ] = await Promise.all([
    query<{ entry_date: string; weight_kg: string }>(
      `SELECT entry_date::text AS entry_date, weight_kg::text AS weight_kg
         FROM weigh_ins WHERE user_id = $1 ORDER BY entry_date DESC LIMIT 1`,
      [userId]
    ),
    query<{ calories: string | null; protein_g: string | null; carbs_g: string | null; fat_g: string | null }>(
      `SELECT COALESCE(SUM(calories),0)::text AS calories,
              COALESCE(SUM(protein_g),0)::text AS protein_g,
              COALESCE(SUM(carbs_g),0)::text AS carbs_g,
              COALESCE(SUM(fat_g),0)::text AS fat_g
         FROM food_logs WHERE user_id = $1 AND entry_date = $2`,
      [userId, today]
    ),
    query<{ burned: string | null }>(
      `SELECT COALESCE(SUM(calories_burned),0)::text AS burned
         FROM exercise_logs WHERE user_id = $1 AND entry_date = $2`,
      [userId, today]
    ),
    query<{ ml: number | null }>(
      `SELECT COALESCE(SUM(amount_ml),0)::int AS ml
         FROM water_logs WHERE user_id = $1 AND entry_date = $2`,
      [userId, today]
    ),
    query<{ steps: number | null }>(
      `SELECT COALESCE(MAX(steps),0)::int AS steps
         FROM step_logs WHERE user_id = $1 AND entry_date = $2`,
      [userId, today]
    ),
    query<{ entry_date: string; weight_kg: string }>(
      `SELECT entry_date::text AS entry_date, weight_kg::text AS weight_kg
         FROM weigh_ins WHERE user_id = $1
         ORDER BY entry_date ASC LIMIT 60`,
      [userId]
    ),
    query<{ entry_date: string; ml: number }>(
      `SELECT entry_date::text AS entry_date, SUM(amount_ml)::int AS ml
         FROM water_logs WHERE user_id = $1 AND entry_date >= $2
         GROUP BY entry_date ORDER BY entry_date ASC`,
      [userId, thirtyDaysAgo]
    ),
    query<{ entry_date: string; steps: number }>(
      `SELECT entry_date::text AS entry_date, steps
         FROM step_logs WHERE user_id = $1 AND entry_date >= $2
         ORDER BY entry_date ASC`,
      [userId, thirtyDaysAgo]
    ),
    query<{ entry_date: string; calories: string }>(
      `SELECT entry_date::text AS entry_date, COALESCE(SUM(calories),0)::text AS calories
         FROM food_logs WHERE user_id = $1 AND entry_date >= $2
         GROUP BY entry_date ORDER BY entry_date ASC`,
      [userId, thirtyDaysAgo]
    ),
    query<{ entry_date: string; burned: string }>(
      `SELECT entry_date::text AS entry_date, COALESCE(SUM(calories_burned),0)::text AS burned
         FROM exercise_logs WHERE user_id = $1 AND entry_date >= $2
         GROUP BY entry_date ORDER BY entry_date ASC`,
      [userId, thirtyDaysAgo]
    ),
    query<any>(
      `SELECT entry_date::text AS entry_date,
              waist_cm::text AS waist_cm, chest_cm::text AS chest_cm,
              hips_cm::text  AS hips_cm,  thigh_cm::text AS thigh_cm,
              arm_cm::text   AS arm_cm
         FROM measurements WHERE user_id = $1
         ORDER BY entry_date ASC LIMIT 365`,
      [userId]
    ),
  ]);

  const latest = latestW.rows[0];
  const weights = weightSeries.rows.map((r) => ({ date: r.entry_date, kg: Number.parseFloat(r.weight_kg) }));
  const startKg = weights.length > 0 ? weights[0].kg : null;
  const currentKg = latest ? Number.parseFloat(latest.weight_kg) : null;

  // Calculate weekly rate
  let weeklyRate: number | null = null;
  if (weights.length >= 2) {
    const newest = weights[weights.length - 1];
    const oldest = weights[0];
    const days = Math.max(1, differenceInDays(parseISO(newest.date), parseISO(oldest.date)));
    weeklyRate = ((newest.kg - oldest.kg) / days) * 7;
  }

  // Build water series (daily totals, fill gaps)
  const waterMap = new Map<string, number>();
  for (const r of waterSeries.rows) waterMap.set(r.entry_date, r.ml);
  const waterChartData = [];
  for (let i = 29; i >= 0; i--) {
    const d = subDays(parseISO(today), i).toISOString().slice(0, 10);
    waterChartData.push({ date: d, ml: waterMap.get(d) || 0 });
  }

  // Build steps series
  const stepsMap = new Map<string, number>();
  for (const r of stepsSeries.rows) stepsMap.set(r.entry_date, r.steps);
  const stepsChartData = [];
  for (let i = 29; i >= 0; i--) {
    const d = subDays(parseISO(today), i).toISOString().slice(0, 10);
    stepsChartData.push({ date: d, steps: stepsMap.get(d) || 0 });
  }

  // Merge food in + exercise out for calorie chart
  const foodMap = new Map<string, number>();
  for (const r of foodSeries.rows) foodMap.set(r.entry_date, Number(r.calories));
  const exMap = new Map<string, number>();
  for (const r of exSeries.rows) exMap.set(r.entry_date, Number(r.burned));
  const calChartData = [];
  for (let i = 29; i >= 0; i--) {
    const d = subDays(parseISO(today), i).toISOString().slice(0, 10);
    calChartData.push({ date: d, in: foodMap.get(d) || 0, out: exMap.get(d) || 0 });
  }

  const measureData = measureSeries.rows.map((r: any) => ({
    date: r.entry_date,
    waist: r.waist_cm ? Number.parseFloat(r.waist_cm) : null,
    chest: r.chest_cm ? Number.parseFloat(r.chest_cm) : null,
    hips: r.hips_cm ? Number.parseFloat(r.hips_cm) : null,
    thigh: r.thigh_cm ? Number.parseFloat(r.thigh_cm) : null,
    arm: r.arm_cm ? Number.parseFloat(r.arm_cm) : null
  }));

  return {
    today,
    latest: latest ? { date: latest.entry_date, kg: currentKg! } : null,
    currentKg,
    startKg,
    weeklyRate,
    todayFood: {
      calories:  Number(todayFood.rows[0]?.calories || 0),
      protein_g: Number(todayFood.rows[0]?.protein_g || 0),
      carbs_g:   Number(todayFood.rows[0]?.carbs_g || 0),
      fat_g:     Number(todayFood.rows[0]?.fat_g || 0),
    },
    todayBurned: Number(todayEx.rows[0]?.burned || 0),
    todayWater: Number(todayWater.rows[0]?.ml || 0),
    todaySteps: Number(todaySteps.rows[0]?.steps || 0),
    chartData: weights,
    waterChartData,
    stepsChartData,
    calChartData,
    measureData,
  };
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const d = await loadDashboard(user.id);

  const targetKg = user.target_weight_kg ? Number.parseFloat(user.target_weight_kg) : null;
  const lost = d.currentKg != null && d.startKg != null ? d.startKg - d.currentKg : null;
  const toGo = d.currentKg != null && targetKg != null ? d.currentKg - targetKg : null;

  const macroData: MacroData[] = [
    { name: 'protein', value: d.todayFood.protein_g, color: 'rgb(34 197 94)', label: 'Protein' },
    { name: 'carbs',   value: d.todayFood.carbs_g,   color: 'rgb(59 130 246)', label: 'Carbs' },
    { name: 'fat',     value: d.todayFood.fat_g,     color: 'rgb(234 179 8)',  label: 'Fat' },
  ];

  const calTarget = user.calorie_target || 2000;
  const waterTarget = 2000;
  const stepsTarget = 10000;

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Hero section */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <WeightRing
            currentKg={d.currentKg ?? 0}
            targetKg={targetKg}
            startKg={d.startKg}
            lost={lost}
            toGo={toGo}
          />
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: 'rgb(var(--text))' }}>
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user.name}
            </h1>
            <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
              {fmtDate(d.today)}
              {d.weeklyRate != null && (
                <span className="ml-2">
                  · {d.weeklyRate < 0 ? 'Losing' : d.weeklyRate > 0 ? 'Gaining' : 'Steady'}{' '}
                  <span style={{ color: d.weeklyRate <= 0 ? 'rgb(var(--good))' : 'rgb(var(--warn))' }}>
                    {round1(Math.abs(d.weeklyRate!))} kg/wk
                  </span>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 2x2 quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <MiniStat icon={Utensils} label="Energy in" value={`${Math.round(d.todayFood.calories)}`} target={calTarget} unit="kcal" />
          <MiniStat icon={Dumbbell} label="Energy out" value={`${Math.round(d.todayBurned)}`} target={null} unit="kcal" />
          <MiniStat icon={Droplet}  label="Water" value={`${(d.todayWater / 1000).toFixed(1)}`} target={waterTarget / 1000} unit="L" />
          <MiniStat icon={Footprints} label="Steps" value={d.todaySteps.toLocaleString()} target={stepsTarget} unit="" />
        </div>
      </div>

      {/* Weight trend chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: 'rgb(var(--text))' }}>
            <Scale size={16} style={{ color: 'rgb(var(--accent))' }} /> Weight trend
          </h2>
          <Link className="text-xs" style={{ color: 'rgb(var(--accent))' }} href="/progress">View all →</Link>
        </div>
        {d.chartData.length > 0 ? (
          <WeightChart data={d.chartData} targetKg={targetKg} />
        ) : (
          <p className="text-sm py-8 text-center" style={{ color: 'rgb(var(--muted))' }}>
            No weigh-ins yet. <Link href="/weigh-in" style={{ color: 'rgb(var(--accent))' }}>Log your first one</Link>.
          </p>
        )}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5" style={{ color: 'rgb(var(--text))' }}>
            <Droplet size={14} style={{ color: 'rgb(var(--teal))' }} /> Water (30 days)
          </h3>
          <WaterChart data={d.waterChartData} days={30} />
        </div>
        <div className="card">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5" style={{ color: 'rgb(var(--text))' }}>
            <Footprints size={14} style={{ color: 'rgb(var(--blue))' }} /> Steps (30 days)
          </h3>
          <StepsChart data={d.stepsChartData} days={30} />
        </div>
        <div className="card">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5" style={{ color: 'rgb(var(--text))' }}>
            <Utensils size={14} style={{ color: 'rgb(var(--accent))' }} /> Calorie balance (30 days)
          </h3>
          <CalorieChart data={d.calChartData} days={30} />
        </div>
        <div className="card">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5" style={{ color: 'rgb(var(--text))' }}>
            <Scale size={14} style={{ color: 'rgb(var(--teal))' }} /> Today's macros
          </h3>
          <MacroChart data={macroData} />
        </div>
      </div>

      {/* Quick log */}
      <div className="card">
        <h2 className="font-semibold text-sm mb-3" style={{ color: 'rgb(var(--text))' }}>
          Quick log for {fmtDate(d.today)}
        </h2>
        <QuickLog date={d.today} />
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, target, unit }: {
  icon: React.ComponentType<{ size?: string | number }>;
  label: string; value: string; target: number | null; unit: string;
}) {
  const val = Number(value.replace(/,/g, ''));
  const pct = target && target > 0 ? Math.min(100, Math.round((val / target) * 100)) : null;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(var(--panel-rgb), 0.4)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(var(--teal), 0.1)', color: 'rgb(var(--teal))' }}
      >
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'rgb(var(--muted))' }}>{label}</div>
        <div className="text-sm font-semibold" style={{ color: 'rgb(var(--text))' }}>
          {value}{unit && <span className="text-xs font-normal" style={{ color: 'rgb(var(--muted))' }}> {unit}</span>}
        </div>
        {pct != null && (
          <div className="h-1 mt-1 rounded-full overflow-hidden" style={{ background: 'rgba(var(--border), 0.3)' }}>
            <div className="h-full rounded-full gradient-accent" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
