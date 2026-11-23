import type { SQLiteDatabase } from 'expo-sqlite';

import { cacheDayTotal, getCachedDayTotals } from './db';
import { addDays, dayBoundaries, dayKey, today } from './time';
import { usageSource } from './usage';

/**
 * Minutes of screen time for `count` days starting at `firstDay`.
 * Finished days come from the day_totals cache when present and are cached
 * when computed; today and later days are always computed fresh.
 */
export async function getDayTotals(db: SQLiteDatabase, firstDay: Date, count: number): Promise<number[]> {
  // Demo data is computed and always available: caching it would only
  // freeze stale numbers whenever the demo formula changes.
  if (usageSource.kind === 'demo') return usageSource.getMinutes(dayBoundaries(firstDay, count));

  const keys = Array.from({ length: count }, (_, i) => dayKey(addDays(firstDay, i)));
  const todayKey = dayKey(today());
  const cached = new Map(
    (await getCachedDayTotals(db, keys[0], keys[keys.length - 1])).map((r) => [r.day, r.minutes]),
  );

  const needsSource = keys.some((k) => k >= todayKey || !cached.has(k));
  if (!needsSource) return keys.map((k) => cached.get(k)!);

  const fresh = await usageSource.getMinutes(dayBoundaries(firstDay, count));
  const totals: number[] = [];
  for (let i = 0; i < count; i++) {
    const key = keys[i];
    if (key < todayKey && cached.has(key)) {
      totals.push(cached.get(key)!);
    } else {
      totals.push(fresh[i]);
      if (key < todayKey) await cacheDayTotal(db, key, fresh[i]);
    }
  }
  return totals;
}

export async function getWeekTotal(db: SQLiteDatabase, weekStart: Date): Promise<number> {
  return (await getDayTotals(db, weekStart, 7)).reduce((a, b) => a + b, 0);
}
