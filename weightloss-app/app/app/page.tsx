import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { todayISO, fmtDate, round1 } from '@/lib/utils';
import { parseISO, differenceInDays } from 'date-fns';
import Link from 'next/link';
import { Scale, Target, TrendingDown, Flame, Camera, Utensils, Dumbbell, Droplet, Footprints, NotebookText, ArrowRight } from 'lucide-react';
import { QuickLog } from '@/components/QuickLog';
import { WeightChart } from '@/components/WeightChart';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadDashboard(userId: number) {
  const today = todayISO();
  const [latestW, todayFood, todayEx, todayWater, todaySteps, last7w, lastNote, lastPhoto] = await Promise.all([
    query<{ entry_date: string; weight_kg: string }>(
      `SELECT entry_date::text AS entry_date, weight_kg::text AS weight_kg
         FROM weigh_ins WHERE user_id = $1 ORDER BY entry_date DESC LIMIT 1`,
      [userId]
    ),
    query<{ calories: string | null; protein_g: string | null }>(
      `SELECT COALESCE(SUM(calories),0)::text AS calories,
              COALESCE(SUM(protein_g),0)::text AS protein_g
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
         ORDER BY entry_date DESC LIMIT 7`,
      [userId]
    ),
    query<{ entry_date: string; body: string }>(
      `SELECT entry_date::text AS entry_date, body
         FROM daily_notes WHERE user_id = $1
         ORDER BY entry_date DESC LIMIT 1`,
      [userId]
    ),
    query<{ id: number; entry_date: string; filename: string }>(
      `SELECT id, entry_date::text AS entry_date, filename
         FROM photos WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 1`,
      [userId]
    )
  ]);

  const weights = last7w.rows;
  const weekAvg = weights.length
    ? weights.reduce((s, r) => s + Number.parseFloat(r.weight_kg), 0) / weights.length
    : null;
  const latest = latestW.rows[0];
  let weeklyRate: number | null = null;
  if (weights.length >= 2) {
    const newest = weights[0];
    const oldest = weights[weights.length - 1];
    const days = Math.max(1, differenceInDays(parseISO(newest.entry_date), parseISO(oldest.entry_date)));
    weeklyRate = ((Number.parseFloat(newest.weight_kg) - Number.parseFloat(oldest.weight_kg)) / days) * 7;
  }

  return {
    today,
    latest: latest ? { date: latest.entry_date, kg: Number.parseFloat(latest.weight_kg) } : null,
    weekAvg,
    weeklyRate,
    todayFood: {
      calories:  Number(todayFood.rows[0]?.calories || 0),
      protein_g: Number(todayFood.rows[0]?.protein_g || 0)
    },
    todayBurned: Number(todayEx.rows[0]?.burned || 0),
    todayWater: Number(todayWater.rows[0]?.ml || 0),
    todaySteps: Number(todaySteps.rows[0]?.steps || 0),
    lastNote: lastNote.rows[0] || null,
    lastPhoto: lastPhoto.rows[0] || null
  };
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const d = await loadDashboard(user.id);

  // Pull last 30 days of weights for the chart
  const series = await query<{ entry_date: string; weight_kg: string }>(
    `SELECT entry_date::text AS entry_date, weight_kg::text AS weight_kg
       FROM weigh_ins WHERE user_id = $1
       ORDER BY entry_date ASC LIMIT 60`,
    [user.id]
  );
  const chartData = series.rows.map((r) => ({ date: r.entry_date, kg: Number.parseFloat(r.weight_kg) }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome back, {user.name}</h1>
        <span className="text-sm text-muted">{fmtDate(d.today)}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Scale} label="Current weight"
          value={d.latest ? `${round1(d.latest.kg)} kg` : '—'}
          sub={d.latest ? `Logged ${fmtDate(d.latest.date)}` : 'No weigh-in yet'}
          href="/weigh-in"
        />
        <StatCard
          icon={TrendingDown} label="Weekly rate"
          value={d.weeklyRate == null ? '—' : `${round1(d.weeklyRate)} kg/wk`}
          sub={d.weeklyRate == null
            ? 'Need 2+ weigh-ins'
            : (d.weeklyRate < 0 ? 'Losing' : d.weeklyRate > 0 ? 'Gaining' : 'Steady')}
          tone={d.weeklyRate != null ? (d.weeklyRate <= 0 ? 'good' : 'warn') : undefined}
        />
        <StatCard
          icon={Utensils} label="Calories in"
          value={`${Math.round(d.todayFood.calories)}`}
          sub={`Protein ${Math.round(d.todayFood.protein_g)} g`}
          href="/food"
        />
        <StatCard
          icon={Dumbbell} label="Calories out"
          value={`${Math.round(d.todayBurned)}`}
          sub={d.todayBurned > 0 ? 'Active today' : 'No exercise yet'}
          href="/exercise"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold flex items-center gap-1.5"><Scale size={16}/> Weight trend</h2>
            <Link className="text-xs text-accent hover:underline" href="/progress">View all →</Link>
          </div>
          {chartData.length > 0 ? (
            <WeightChart data={chartData} />
          ) : (
            <p className="text-sm text-muted py-8 text-center">
              No weigh-ins yet. <Link href="/weigh-in" className="text-accent hover:underline">Log your first one</Link>.
            </p>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-2 flex items-center gap-1.5"><Target size={16}/> Goals</h2>
          <dl className="text-sm space-y-1.5">
            <Row label="Target weight" value={user.target_weight_kg ? `${round1(user.target_weight_kg)} kg` : '—'} />
            <Row label="Daily deficit" value={user.target_calorie_deficit ? `${user.target_calorie_deficit} kcal` : '—'} />
            <Row label="Target date" value={user.target_date || '—'} />
            <Row label="Calorie target" value={user.calorie_target ? `${user.calorie_target} kcal` : '—'} />
          </dl>
          <Link href="/goals" className="btn mt-3 w-full">Edit goals <ArrowRight size={14}/></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-2">Quick log for today</h2>
          <QuickLog date={d.today} />
        </div>

        <div className="card space-y-2">
          <h2 className="font-semibold flex items-center gap-1.5"><Flame size={16}/> Adherence</h2>
          <AdherenceSummary userId={user.id} />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <SmallStat icon={Droplet}    label="Water"   value={`${(d.todayWater / 1000).toFixed(1)} L`} />
            <SmallStat icon={Footprints} label="Steps"   value={d.todaySteps.toLocaleString()} />
            <SmallStat icon={NotebookText} label="Note"   value={d.lastNote ? fmtDate(d.lastNote.entry_date) : '—'} />
            <SmallStat icon={Camera}     label="Photo"   value={d.lastPhoto ? fmtDate(d.lastPhoto.entry_date) : '—'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, href, tone }:
  { icon: React.ComponentType<{ size?: string | number }>; label: string; value: string; sub?: string; href?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const inner = (
    <div className="card-tight">
      <div className="flex items-center gap-1.5 stat-label">
        <Icon size={12} />
        {label}
      </div>
      <div className={'stat mt-1 ' + (tone === 'good' ? 'text-good' : tone === 'warn' ? 'text-warn' : tone === 'bad' ? 'text-bad' : '')}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  );
  if (href) return <Link href={href} className="block hover:opacity-90 transition-opacity">{inner}</Link>;
  return inner;
}

function SmallStat({ icon: Icon, label, value }:
  { icon: React.ComponentType<{ size?: string | number }>; label: string; value: string }) {
  return (
    <div className="card-tight">
      <div className="flex items-center gap-1 text-xs text-muted">
        <Icon size={12} />{label}
      </div>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border last:border-0 pb-1.5 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

async function AdherenceSummary({ userId }: { userId: number }) {
  const r = await query<{ n: number }>(
    `WITH days AS (
       SELECT DISTINCT entry_date::text AS d FROM (
         SELECT entry_date FROM weigh_ins WHERE user_id = $1
         UNION SELECT entry_date FROM food_logs WHERE user_id = $1
         UNION SELECT entry_date FROM exercise_logs WHERE user_id = $1
         UNION SELECT entry_date FROM water_logs WHERE user_id = $1
         UNION SELECT entry_date FROM step_logs WHERE user_id = $1
       ) s
       WHERE entry_date >= (CURRENT_DATE - INTERVAL '29 days')
     )
     SELECT COUNT(*)::int AS n FROM days`,
    [userId]
  );
  const pct = Math.round((Number(r.rows[0]?.n ?? 0) / 30) * 100);
  return (
    <div>
      <div className="text-2xl font-semibold">{pct}%</div>
      <div className="text-xs text-muted">of last 30 days had at least one log</div>
      <div className="mt-2 h-2 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
