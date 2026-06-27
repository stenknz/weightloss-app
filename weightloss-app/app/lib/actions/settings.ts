'use server';

import { getCurrentUser } from '@/lib/auth';
import { appSettingsSchema } from '@/lib/validation';
import { audit } from '@/lib/audit';
import { setSetting, invalidateSettingsCache } from '@/lib/settings';
import { z } from 'zod';
import { headers } from 'next/headers';

export async function updateSettings(data: { invite_only?: boolean; app_name?: string }) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };
  if (user.role !== 'admin') return { error: 'Forbidden' };

  const parsed = appSettingsSchema.safeParse(data);
  if (!parsed.success) return { error: 'Validation failed' };

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

  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  await audit({ userId: user.id, action: 'settings_update',
    targetType: 'app_settings', targetId: null, ip,
    details: { changed } });

  if (changed.length === 0) return { error: 'No changes' };
  return { ok: true, changed };
}
