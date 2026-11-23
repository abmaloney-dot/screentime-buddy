import { clock } from './clock';

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Local calendar day as 'YYYY-MM-DD' — the key used in the database. */
export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Today's midnight by the app clock. */
export function today(): Date {
  return startOfDay(clock.date());
}

/** Weeks run Monday–Sunday; a week is keyed by its Monday's dayKey. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  return addDays(d, -((d.getDay() + 6) % 7));
}

export function formatWeek(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

/**
 * 25 timestamps marking the local hours of `day`. Built with setHours rather
 * than adding 3 600 000 ms so daylight-saving days get 23/25-hour spans right.
 */
export function hourBoundaries(day: Date): number[] {
  const start = startOfDay(day);
  return Array.from({ length: 25 }, (_, h) => {
    const d = new Date(start);
    d.setHours(h);
    return d.getTime();
  });
}

/** `count + 1` midnights starting at `firstDay`. */
export function dayBoundaries(firstDay: Date, count: number): number[] {
  const start = startOfDay(firstDay);
  return Array.from({ length: count + 1 }, (_, i) => addDays(start, i).getTime());
}

export function formatMinutes(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function formatDay(date: Date): string {
  const diff = Math.round((today().getTime() - startOfDay(date).getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
