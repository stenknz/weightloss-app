// =============================================================================
// Application-wide constants and runtime config helpers
// =============================================================================
export const APP_NAME = 'Weight Loss';

export function maxPhotoSizeBytes(): number {
  return Number.parseInt(process.env.MAX_PHOTO_SIZE_MB || '10', 10) * 1024 * 1024;
}

export function maxPhotoStorageBytes(): number {
  return Number.parseInt(process.env.MAX_PHOTO_STORAGE_MB || '500', 10) * 1024 * 1024;
}

export function maxPhotosPerDay(): number {
  return Number.parseInt(process.env.MAX_PHOTOS_PER_DAY || '50', 10);
}

export function loginRateLimitPerHour(): number {
  return Number.parseInt(process.env.LOGIN_RATE_LIMIT_PER_HOUR || '10', 10);
}

export const ACTIVITY_LEVELS = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active'
] as const;

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export const SEXES = ['male', 'female', 'other'] as const;

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads';
export const LOG_DIR    = process.env.LOG_DIR    || '/app/logs';
export const DATA_DIR   = process.env.DATA_DIR   || '/app/data';
