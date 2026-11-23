import { findTag, type Tag } from './tags';

/** Least-squares slope of `values` against their index: minutes gained/lost per day. */
export function slopePerDay(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  return num / den;
}

export type ActiveHour = {
  hour: number;
  avgMinutes: number;
  /** The label most often given to this hour across the range, if any. */
  topTag: { tag: Tag; days: number } | null;
};

/**
 * @param hourly  hourly[d][h] = minutes on day d at hour h
 * @param tagsByDay  tagsByDay[d][h] = tag id, if labelled
 */
export function mostActiveHours(
  hourly: number[][],
  tagsByDay: Partial<Record<number, string>>[],
  count = 3,
): ActiveHour[] {
  const days = hourly.length || 1;
  const hours: ActiveHour[] = Array.from({ length: 24 }, (_, hour) => {
    const tagCounts = new Map<string, number>();
    for (const tags of tagsByDay) {
      const id = tags[hour];
      if (id) tagCounts.set(id, (tagCounts.get(id) ?? 0) + 1);
    }
    const [bestId, bestCount] = [...tagCounts].sort((a, b) => b[1] - a[1])[0] ?? [];
    const tag = findTag(bestId);
    return {
      hour,
      avgMinutes: hourly.reduce((sum, day) => sum + day[hour], 0) / days,
      topTag: tag && bestCount ? { tag, days: bestCount } : null,
    };
  });
  return hours.sort((a, b) => b.avgMinutes - a.avgMinutes).slice(0, count);
}

export function averageByHour(hourly: number[][]): number[] {
  const days = hourly.length || 1;
  return Array.from({ length: 24 }, (_, h) => hourly.reduce((sum, day) => sum + day[h], 0) / days);
}
