// =============================================================================
// Application settings (key/value) with cache
// =============================================================================
import { query } from './db';

let cache: Map<string, string> | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 30_000;

async function loadCache(): Promise<Map<string, string>> {
  if (cache && Date.now() - cacheLoadedAt < CACHE_TTL_MS) return cache;
  const r = await query<{ key: string; value: string }>('SELECT key, value FROM app_settings');
  cache = new Map(r.rows.map((row) => [row.key, row.value]));
  cacheLoadedAt = Date.now();
  return cache;
}

export async function getSetting(key: string, fallback?: string): Promise<string | undefined> {
  const c = await loadCache();
  return c.get(key) ?? fallback;
}

export async function getBoolSetting(key: string, fallback = false): Promise<boolean> {
  const v = await getSetting(key);
  if (v == null) return fallback;
  return v === 'true' || v === '1' || v === 'yes';
}

export async function setSetting(key: string, value: string): Promise<void> {
  await query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value]
  );
  if (cache) cache.set(key, value);
}

export function invalidateSettingsCache() {
  cache = null;
  cacheLoadedAt = 0;
}
