import { averageByHour } from './stats';
import { findTag, type TagId } from './tags';
import { formatHour } from './time';

export type Tip = {
  id: string;
  emoji: string;
  title: string;
  /** Why this tip, in the user's own numbers. */
  reason: string;
  action: string;
  /** Average minutes per day this tip targets; used for ranking. */
  minutesPerDay: number;
};

// One recommendation per activity label.
const TAG_TIPS: Record<TagId, { id: string; emoji: string; title: string; action: string }> = {
  meal: {
    id: 'phone-free-meals',
    emoji: '🍽️',
    title: 'Phone-free meals',
    action: 'Leave your phone in another room while you eat, or put it face down out of reach.',
  },
  bed: {
    id: 'no-phones-before-bed',
    emoji: '🛏️',
    title: 'No phones before bed',
    action: 'Put the phone away 30 minutes before sleep and charge it outside the bedroom.',
  },
  fun: {
    id: 'move-instead-of-scroll',
    emoji: '🚶',
    title: 'Replace scrolling with physical activity',
    action: 'When you reach for entertainment, take a 10-minute walk or stretch first.',
  },
  social: {
    id: 'batch-social',
    emoji: '💬',
    title: 'Batch your check-ins',
    action: 'Reply to messages at two or three set times a day instead of whenever they arrive.',
  },
  work: {
    id: 'focus-blocks',
    emoji: '🎯',
    title: 'Work in focus blocks',
    action: 'Turn on Do Not Disturb for 50-minute blocks and check your phone only in the breaks.',
  },
  commute: {
    id: 'screen-free-commute',
    emoji: '🎧',
    title: 'Screen-free commute',
    action: 'Listen to a podcast or audiobook with the screen off, or just look out of the window.',
  },
  other: {
    id: 'name-the-other',
    emoji: '🔎',
    title: 'Name your "Other" time',
    action: 'Relabel "Other" hours with what you were actually doing, so the tips can be specific.',
  },
};

const LATE_HOURS = [22, 23, 0, 1];
const EVENING_HOURS = [17, 18, 19, 20, 21];
/** Below this, a pattern is too small to be worth a tip. */
const MIN_MINUTES_PER_DAY = 10;

/**
 * Builds tips from the last days of usage.
 * @param hourly  hourly[d][h] = minutes on day d at hour h
 * @param tagsByDay  tagsByDay[d][h] = the label the user gave that hour
 */
export function buildTips(hourly: number[][], tagsByDay: Partial<Record<number, string>>[]): Tip[] {
  const tips = new Map<string, Tip>();
  const add = (tip: Tip) => {
    const existing = tips.get(tip.id);
    if (tip.minutesPerDay >= MIN_MINUTES_PER_DAY && (!existing || existing.minutesPerDay < tip.minutesPerDay)) {
      tips.set(tip.id, tip);
    }
  };

  // 1. Labelled time: minutes in hours carrying each label, averaged over
  // the days that label was used. People don't label every day, so
  // averaging over all days would bury a pattern seen on the labelled ones.
  const perTag = new Map<string, { minutes: number; days: Set<number> }>();
  hourly.forEach((day, d) =>
    day.forEach((m, h) => {
      const tag = tagsByDay[d]?.[h];
      if (!tag) return;
      const entry = perTag.get(tag) ?? { minutes: 0, days: new Set<number>() };
      entry.minutes += m;
      entry.days.add(d);
      perTag.set(tag, entry);
    }),
  );
  for (const [tagId, { minutes, days: labelledDays }] of perTag) {
    const tag = findTag(tagId);
    const base = tag && TAG_TIPS[tag.id];
    if (!tag || !base) continue;
    const perDay = minutes / labelledDays.size;
    add({
      ...base,
      reason: `On days you labelled it, ${tag.label.toLowerCase()} came with ${Math.round(perDay)} min of screen time.`,
      minutesPerDay: perDay,
    });
  }

  // 2. Patterns by time of day, labelled or not.
  const avg = averageByHour(hourly);
  const late = LATE_HOURS.reduce((sum, h) => sum + avg[h], 0);
  add({
    ...TAG_TIPS.bed,
    reason: `Between 22:00 and 02:00 you average ${Math.round(late)} min a day on your phone.`,
    minutesPerDay: late,
  });

  const peak = EVENING_HOURS.reduce((best, h) => (avg[h] > avg[best] ? h : best), EVENING_HOURS[0]);
  const evening = EVENING_HOURS.reduce((sum, h) => sum + avg[h], 0);
  add({
    ...TAG_TIPS.fun,
    reason: `Evenings (17:00–22:00) average ${Math.round(evening)} min a day, peaking at ${formatHour(peak)}.`,
    minutesPerDay: evening,
  });

  return [...tips.values()].sort((a, b) => b.minutesPerDay - a.minutesPerDay);
}

/** Busy hours nobody labelled yet: labelling them makes tips more specific. */
export function unlabelledBusyHours(
  hourly: number[][],
  tagsByDay: Partial<Record<number, string>>[],
  count = 3,
): number[] {
  const avg = averageByHour(hourly);
  const labelled = new Set(tagsByDay.flatMap((t) => Object.keys(t).map(Number)));
  return avg
    .map((m, h) => ({ h, m }))
    .filter((x) => !labelled.has(x.h) && x.m >= MIN_MINUTES_PER_DAY / 2)
    .sort((a, b) => b.m - a.m)
    .slice(0, count)
    .map((x) => x.h);
}
