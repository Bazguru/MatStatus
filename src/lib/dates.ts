const DAY = 24 * 60 * 60 * 1000;

/** Today's date as YYYY-MM-DD in local time. */
export function today(now: Date = new Date()): string {
  return toIso(now);
}

export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = fromIso(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

/** Whole days from `from` to `iso` (negative = in the past). */
export function daysUntil(iso: string, from: string = today()): number {
  return Math.round((fromIso(iso).getTime() - fromIso(from).getTime()) / DAY);
}

export type ExpiryStatus = 'expired' | 'today' | 'soon' | 'ok';

export function expiryStatus(iso: string, warnDays: number, from: string = today()): ExpiryStatus {
  const d = daysUntil(iso, from);
  if (d < 0) return 'expired';
  if (d === 0) return 'today';
  if (d <= warnDays) return 'soon';
  return 'ok';
}

export function describeExpiry(iso: string, from: string = today()): string {
  const d = daysUntil(iso, from);
  if (d < -1) return `Gick ut för ${-d} dagar sedan`;
  if (d === -1) return 'Gick ut igår';
  if (d === 0) return 'Går ut idag';
  if (d === 1) return 'Går ut imorgon';
  if (d < 14) return `${d} dagar kvar`;
  if (d < 60) return `${Math.round(d / 7)} veckor kvar`;
  return `${Math.round(d / 30)} mån kvar`;
}
