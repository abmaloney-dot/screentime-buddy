import UsageStats from '@modules/usage-stats';

import { clock } from '../clock';
import { dayKey, startOfWeek } from '../time';

/**
 * Everything the screens need from "the platform". Android reads real data;
 * every other runtime (iOS, web, Expo Go) gets deterministic demo data so the
 * UI can be explored without a native build.
 */
export interface UsageSource {
  kind: 'android' | 'demo';
  hasPermission(): boolean;
  openPermissionSettings(): void;
  /** N+1 epoch-ms boundaries in, N minute totals out. */
  getMinutes(boundaries: number[]): Promise<number[]>;
}

function androidSource(native: NonNullable<typeof UsageStats>): UsageSource {
  return {
    kind: 'android',
    hasPermission: () => native.hasPermission(),
    openPermissionSettings: () => native.openPermissionSettings(),
    getMinutes: (boundaries) => native.getScreenTimeBuckets(boundaries),
  };
}

// Typical minutes-per-hour shape: quiet nights, lunch bump, evening peak.
const DEMO_PROFILE = [
  2, 1, 0, 0, 0, 1, 4, 14, 20, 10, 9, 11, 28, 14, 10, 12, 13, 16, 24, 32, 38, 42, 30, 12,
];

// Small string hash → [0, 1), so the same hour always gets the same value.
function noise(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

function demoMinutesForHour(hourStart: Date): number {
  const hour = hourStart.getHours();
  const factor = 0.5 + noise(`${dayKey(hourStart)}-${hour}`) * 0.8;
  // Hourly noise averages out over a week, so without this every week would
  // match the last one within ~1% and no weekly goal could ever be met.
  // A per-week factor (0.85–1.15) gives good weeks and bad weeks.
  const week = 0.85 + noise(`week-${dayKey(startOfWeek(hourStart))}`) * 0.3;
  return Math.min(60, DEMO_PROFILE[hour] * factor * week);
}

const demoSource: UsageSource = {
  kind: 'demo',
  hasPermission: () => true,
  openPermissionSettings: () => {},
  async getMinutes(boundaries) {
    // Demo usage stops at the app clock's "now", which dev tools can move.
    const now = clock.now();
    const result: number[] = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const end = Math.min(boundaries[i + 1], now);
      let total = 0;
      const cursor = new Date(boundaries[i]);
      cursor.setMinutes(0, 0, 0);
      while (cursor.getTime() < end) {
        const next = new Date(cursor);
        next.setHours(cursor.getHours() + 1);
        const overlap = Math.min(end, next.getTime()) - Math.max(boundaries[i], cursor.getTime());
        if (overlap > 0) total += demoMinutesForHour(cursor) * (overlap / 3_600_000);
        cursor.setTime(next.getTime());
      }
      result.push(total);
    }
    return result;
  },
};

export const usageSource: UsageSource = UsageStats ? androidSource(UsageStats) : demoSource;
