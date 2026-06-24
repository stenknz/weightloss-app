// =============================================================================
// General utilities
// =============================================================================
import { format, parseISO, differenceInDays, startOfWeek, addDays } from 'date-fns';

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function toISODate(d: Date | string): string {
  const dt = typeof d === 'string' ? parseISO(d) : d;
  return format(dt, 'yyyy-MM-dd');
}

export function fmtDate(d: string | Date): string {
  const dt = typeof d === 'string' ? parseISO(d) : d;
  return format(dt, 'MMM d, yyyy');
}

export function fmtDateTime(d: string | Date): string {
  const dt = typeof d === 'string' ? parseISO(d) : d;
  return format(dt, 'MMM d, yyyy HH:mm');
}

export function daysBetween(a: string, b: string): number {
  return Math.abs(differenceInDays(parseISO(a), parseISO(b)));
}

export function startOfWeekISO(d: string = todayISO()): string {
  return format(startOfWeek(parseISO(d), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function endOfWeekISO(d: string = todayISO()): string {
  return format(addDays(startOfWeek(parseISO(d), { weekStartsOn: 1 }), 6), 'yyyy-MM-dd');
}

export function round1(n: number | string | null | undefined): string {
  if (n == null) return '';
  const x = typeof n === 'string' ? Number.parseFloat(n) : n;
  if (!Number.isFinite(x)) return '';
  return (Math.round(x * 10) / 10).toString();
}

export function round0(n: number | string | null | undefined): string {
  if (n == null) return '';
  const x = typeof n === 'string' ? Number.parseFloat(n) : n;
  if (!Number.isFinite(x)) return '';
  return Math.round(x).toString();
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function safeJsonParse<T = unknown>(s: string | null | undefined): T | null {
  if (!s) return null;
  try { return JSON.parse(s) as T; } catch { return null; }
}

/** Generate a human-friendly invite code, e.g. APPLE-CARROT-42 */
export function makeInviteCode(): string {
  const words = [
    'apple','arrow','beach','berry','blade','blaze','breeze','cabin',
    'canyon','cedar','cherry','chess','cinder','clover','comet','copper',
    'coral','cosmic','crane','crisp','crystal','delta','dune','ember',
    'fable','falcon','fern','forest','frost','galaxy','garden','garnet',
    'ginger','glade','granite','harbor','harvest','hawk','hazel','helix',
    'horizon','iris','ivory','jade','jasper','jungle','kestrel','lagoon',
    'lantern','lemon','lichen','lotus','lunar','marble','meadow','mint',
    'mistral','morning','mosaic','nectar','nimbus','ocean','onyx','opal',
    'orchid','otter','panda','pebble','pine','plum','polar','prairie',
    'quartz','quiet','raven','ridge','river','robin','rustic','sapling',
    'scarlet','shadow','silver','spruce','storm','summit','sunset','tiger',
    'topaz','tundra','valley','velvet','violet','vista','willow','zephyr'
  ];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  return `${pick()}-${pick()}-${Math.floor(Math.random() * 90 + 10)}`.toUpperCase();
}
