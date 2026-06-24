// =============================================================================
// Password hashing using bcryptjs (pure JavaScript, no native dependencies)
// =============================================================================
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, stored);
  } catch {
    return false;
  }
}

export function validatePasswordStrength(plain: string): { ok: boolean; reason?: string } {
  if (typeof plain !== 'string') return { ok: false, reason: 'Password is required' };
  if (plain.length < 10) return { ok: false, reason: 'Password must be at least 10 characters' };
  if (plain.length > 256) return { ok: false, reason: 'Password is too long' };
  if (!/[A-Za-z]/.test(plain)) return { ok: false, reason: 'Password must contain a letter' };
  if (!/[0-9!-/:-@\[-`{-~]/.test(plain)) {
    return { ok: false, reason: 'Password must contain a number or symbol' };
  }
  return { ok: true };
}
