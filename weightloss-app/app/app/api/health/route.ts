import { json } from '@/lib/api';
import { seedAdminIfEmpty } from '@/lib/seed';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await seedAdminIfEmpty();
  } catch (err) {
    return json({ ok: false, error: String(err) }, { status: 500 });
  }
  return json({ ok: true, ts: new Date().toISOString() });
}
