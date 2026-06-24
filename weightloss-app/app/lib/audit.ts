// =============================================================================
// Audit log helpers
// =============================================================================
import { query } from './db';

export async function audit(opts: {
  userId: number | null;
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  details?: unknown;
  ip?: string | null;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log (user_id, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        opts.userId,
        opts.action,
        opts.targetType ?? null,
        opts.targetId == null ? null : String(opts.targetId),
        opts.details == null ? null : JSON.stringify(opts.details),
        opts.ip ?? null
      ]
    );
  } catch (err) {
    // Audit failure must never break user-facing actions
    console.error('[audit] failed to write entry:', err);
  }
}
