// =============================================================================
// Fixed-window in-database rate limiting. Persisted in the rate_limits table
// so a restart of the app does not reset quotas.
// =============================================================================
import { query } from './db';

const KEY_TTL_SECONDS = 3600;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
};

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number = KEY_TTL_SECONDS
): Promise<RateLimitResult> {
  const resetAt = new Date(Date.now() + windowSeconds * 1000);
  const { rows } = await query<{ count: number; window_start: Date }>(
    `INSERT INTO rate_limits (key, count, window_start)
     VALUES ($1, 1, now())
     ON CONFLICT (key) DO UPDATE
       SET count = CASE
             WHEN rate_limits.window_start + ($2::bigint * interval '1 second') <= now()
             THEN 1
             ELSE rate_limits.count + 1
           END,
           window_start = CASE
             WHEN rate_limits.window_start + ($2::bigint * interval '1 second') <= now()
             THEN now()
             ELSE rate_limits.window_start
           END
     RETURNING count, window_start`,
    [key, windowSeconds]
  );
  const count = Number(rows[0]?.count ?? 0);
  const allowed = count <= limit;
  const remaining = Math.max(0, limit - count);
  return { allowed, remaining, resetAt, limit };
}

export async function resetRateLimit(key: string): Promise<void> {
  await query('DELETE FROM rate_limits WHERE key = $1', [key]);
}

export function loginKey(ip: string | null, email: string): string {
  return `login:${(ip || 'unknown').slice(0, 64)}:${email.toLowerCase()}`;
}

export function ipKey(ip: string | null, scope: string): string {
  return `ip:${scope}:${(ip || 'unknown').slice(0, 64)}`;
}
