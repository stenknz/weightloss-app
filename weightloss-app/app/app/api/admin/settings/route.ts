import { NextRequest } from 'next/server';
import { json, err, validated } from '@/lib/api';
import { appSettingsSchema } from '@/lib/validation';
import { requireAdmin, requireCsrf, getClientIp } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { getSetting, getBoolSetting, setSetting, invalidateSettingsCache } from '@/lib/settings';
import { APP_NAME } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;
  const invite_only = await getBoolSetting('invite_only', true);
  const app_name    = (await getSetting('app_name', APP_NAME)) || APP_NAME;
  return json({ invite_only, app_name });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;
  const csrf = await requireCsrf(request, auth.user);
  if (csrf) return csrf;

  const parsed = await validated(request, appSettingsSchema);
  if (!parsed.ok) return parsed.response;
  const changed: string[] = [];
  if (parsed.data.invite_only !== undefined) {
    await setSetting('invite_only', parsed.data.invite_only ? 'true' : 'false');
    changed.push('invite_only');
  }
  if (parsed.data.app_name !== undefined) {
    await setSetting('app_name', parsed.data.app_name);
    changed.push('app_name');
  }
  invalidateSettingsCache();
  await audit({ userId: auth.user.id, action: 'settings_update',
    targetType: 'app_settings', targetId: null, ip: await getClientIp(request),
    details: { changed } });
  if (changed.length === 0) return err('No changes', 400);
  return json({ ok: true, changed });
}
