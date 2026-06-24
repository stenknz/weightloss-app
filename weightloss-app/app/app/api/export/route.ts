import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { getClientIp } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TABLES = [
  'weigh_ins', 'measurements', 'photos', 'food_logs',
  'exercise_logs', 'water_logs', 'step_logs', 'daily_notes'
] as const;

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const url = new URL(request.url);
  const format = (url.searchParams.get('format') || 'json').toLowerCase();
  const table = url.searchParams.get('table');

  const out: Record<string, unknown[]> = {};
  if (table && (TABLES as readonly string[]).includes(table)) {
    out[table] = (await query(
      `SELECT * FROM ${table} WHERE user_id = $1 ORDER BY id`,
      [auth.user.id]
    )).rows;
  } else {
    for (const t of TABLES) {
      out[t] = (await query(
        `SELECT * FROM ${t} WHERE user_id = $1 ORDER BY id`,
        [auth.user.id]
      )).rows;
    }
  }

  await audit({ userId: auth.user.id, action: 'data_export',
    targetType: 'user', targetId: auth.user.id, ip: await getClientIp(request),
    details: { format, table } });

  if (format === 'csv') {
    // Bundle all tables into a single CSV with a leading "## table" marker row.
    const lines: string[] = [];
    for (const t of Object.keys(out)) {
      const rows = out[t] as Record<string, unknown>[];
      lines.push(`## ${t}`);
      if (rows.length === 0) { lines.push(''); continue; }
      const cols = Object.keys(rows[0]);
      lines.push(cols.map(csvEscape).join(','));
      for (const r of rows) {
        lines.push(cols.map((c) => csvEscape(r[c])).join(','));
      }
      lines.push('');
    }
    const body = lines.join('\n');
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="weightloss-${auth.user.id}-${Date.now()}.csv"`
      }
    });
  }

  // JSON
  const userRow = (await query(
    `SELECT id, email, name, role, is_active, sex, age, height_cm, activity_level,
            target_weight_kg, target_calorie_deficit, target_date,
            calorie_target, protein_target_g, carbs_target_g, fat_target_g,
            created_at, updated_at
       FROM users WHERE id = $1`,
    [auth.user.id]
  )).rows[0] ?? null;

  const body = JSON.stringify({
    exported_at: new Date().toISOString(),
    user: userRow,
    data: out
  }, null, 2);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="weightloss-${auth.user.id}-${Date.now()}.json"`
    }
  });
}
