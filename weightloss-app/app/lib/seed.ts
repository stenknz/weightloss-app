// =============================================================================
// Seed the first admin user on first startup, if the users table is empty.
// Idempotent: safe to call on every boot.
// =============================================================================
import { hashPassword } from './password';
import { query } from './db';

let seeded = false;

export async function seedAdminIfEmpty(): Promise<void> {
  if (seeded) return;
  const r = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
  const count = Number.parseInt(r.rows[0]?.count ?? '0', 10);
  if (count > 0) {
    seeded = true;
    return;
  }

  const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || '';
  const name = (process.env.SEED_ADMIN_NAME || 'Admin').trim() || 'Admin';

  if (!email || !password) {
    console.warn('[seed] users table is empty but SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set; skipping seed');
    return;
  }
  if (password.length < 10) {
    console.warn('[seed] SEED_ADMIN_PASSWORD too short; skipping seed');
    return;
  }

  const passwordHash = await hashPassword(password);
  await query(
    `INSERT INTO users (email, password_hash, name, role, is_active)
     VALUES ($1, $2, $3, 'admin', TRUE)
     ON CONFLICT (email) DO NOTHING`,
    [email, passwordHash, name]
  );
  console.log(`[seed] created initial admin user ${email}`);
  seeded = true;
}
