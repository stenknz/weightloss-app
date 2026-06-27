// =============================================================================
// High-level auth helpers used by API routes and server components.
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies, verifyCsrf, getCsrfFromHeaders, SessionUser } from './session';
import { query } from './db';

export type CurrentUser = SessionUser & {
  // all profile fields that the user can edit; never returned to other users
  sex: string | null;
  age: number | null;
  height_cm: string | null;
  activity_level: string | null;
  target_weight_kg: string | null;
  target_calorie_deficit: number | null;
  target_date: string | null;
  calorie_target: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
  water_target_ml: number;
  photo_storage_used_bytes: number;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const s = await getSessionFromCookies();
  if (!s) return null;
  const r = await query<any>(
    `SELECT sex, age,
            height_cm::text AS height_cm, activity_level,
            target_weight_kg::text AS target_weight_kg, target_calorie_deficit,
            to_char(target_date, 'YYYY-MM-DD') AS target_date,
            calorie_target, protein_target_g, carbs_target_g, fat_target_g,
            water_target_ml,
            photo_storage_used_bytes
       FROM users
      WHERE id = $1`,
    [s.id]
  );
  if (!r.rows[0]) return null;
  return { ...s, ...r.rows[0] };
}

export type AuthedRequest = {
  user: CurrentUser;
  request: NextRequest;
};

/** Require an authenticated user; return 401 response otherwise. */
export async function requireUser(request: NextRequest): Promise<AuthedRequest | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return { user, request };
}

/** Require an admin; returns 401 or 403. */
export async function requireAdmin(request: NextRequest): Promise<AuthedRequest | NextResponse> {
  const r = await requireUser(request);
  if (r instanceof NextResponse) return r;
  if (r.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return r;
}

/** Verify CSRF for mutating requests. Returns a NextResponse on failure, null on success. */
export async function requireCsrf(request: NextRequest, user: SessionUser): Promise<NextResponse | null> {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null;
  if (!verifyCsrf(request.headers, user.csrfToken)) {
    return NextResponse.json({ error: 'CSRF token invalid' }, { status: 403 });
  }
  // Just touch the helper so linter doesn't complain about unused import
  void getCsrfFromHeaders;
  return null;
}

export async function getClientIp(request: NextRequest): Promise<string | null> {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? null;
}
