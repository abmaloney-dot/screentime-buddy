import type { SQLiteDatabase } from 'expo-sqlite';

import {
  CATEGORY_SETTING,
  COUPON_VALID_DAYS,
  couponCode,
  earnedTier,
  findTier,
  pickCategory,
  type Tier,
} from './coupons';
import { getDayTotals, getWeekTotal } from './days';
import {
  getFirstGoalWeek,
  getGoalForWeek,
  getSetting,
  getWeekResults,
  insertCoupon,
  saveWeekResult,
  type WeekResult,
} from './db';
import { addDays, dayKey, parseDayKey, startOfWeek, today } from './time';
import { usageSource } from './usage';

const MAX_BACKFILL_WEEKS = 8;

export function percentChange(current: number, previous: number): number {
  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
}

let inFlight: Promise<WeekResult[]> | null = null;

/**
 * Judges every finished week (Mon–Sun) that had a goal but no result yet:
 * its total vs. the week before. Saves the result plus a coupon when a tier
 * was earned. Returns new results, newest first. Concurrent calls share one
 * run so a week is never judged twice.
 */
export function evaluatePendingWeeks(db: SQLiteDatabase): Promise<WeekResult[]> {
  inFlight ??= run(db).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function run(db: SQLiteDatabase): Promise<WeekResult[]> {
  const firstGoalWeek = await getFirstGoalWeek(db);
  if (!firstGoalWeek || !usageSource.hasPermission()) return [];

  const thisWeek = startOfWeek(today());
  const earliest = addDays(thisWeek, -7 * MAX_BACKFILL_WEEKS);
  const goalStart = parseDayKey(firstGoalWeek);
  const judged = new Set((await getWeekResults(db, MAX_BACKFILL_WEEKS * 2)).map((r) => r.week));
  const categoryPref = await getSetting(db, CATEGORY_SETTING);

  const created: WeekResult[] = [];
  for (let w = goalStart > earliest ? goalStart : earliest; w < thisWeek; w = addDays(w, 7)) {
    const week = dayKey(w);
    if (judged.has(week)) continue;
    const goal = findTier(await getGoalForWeek(db, week));
    if (!goal) continue;

    const [minutes, prevMinutes] = await Promise.all([getWeekTotal(db, w), getWeekTotal(db, addDays(w, -7))]);
    const changePct = percentChange(minutes, prevMinutes);
    const earned = earnedTier(goal, changePct);

    let couponId: number | null = null;
    if (earned) {
      const category = pickCategory(categoryPref, week);
      const issued = addDays(w, 7); // the Monday after the judged week
      couponId = await insertCoupon(db, {
        week,
        tier: earned.id,
        category,
        discount_pct: earned.discountPct,
        code: couponCode(week, earned, category),
        issued_on: dayKey(issued),
        expires_on: dayKey(addDays(issued, COUPON_VALID_DAYS)),
      });
    }

    const result: WeekResult = {
      week,
      minutes,
      prev_minutes: prevMinutes,
      change_pct: changePct,
      goal_tier: goal.id,
      earned_tier: earned?.id ?? null,
      coupon_id: couponId,
    };
    await saveWeekResult(db, result);
    created.push(result);
  }
  return created.reverse();
}

export type WeekProgress = {
  goal: Tier | null;
  weekStart: Date;
  /** Days of this week that have fully passed, plus today (1–7). */
  daysIn: number;
  soFar: number;
  lastWeek: number;
  /** This week's total that meets the goal: last week × (1 − reduction). */
  budget: number | null;
  /** Even share of the budget for one day. */
  dailyBudget: number | null;
  today: number;
};

/** How the current week is going against its goal. */
export async function getWeekProgress(db: SQLiteDatabase): Promise<WeekProgress> {
  const weekStart = startOfWeek(today());
  const daysIn = Math.round((today().getTime() - weekStart.getTime()) / 86_400_000) + 1;
  const [goalId, lastWeek, days] = await Promise.all([
    getGoalForWeek(db, dayKey(weekStart)),
    getWeekTotal(db, addDays(weekStart, -7)),
    getDayTotals(db, weekStart, daysIn),
  ]);
  const goal = findTier(goalId) ?? null;
  const budget = goal && lastWeek > 0 ? lastWeek * (1 - goal.reducePct / 100) : null;
  return {
    goal,
    weekStart,
    daysIn,
    soFar: days.reduce((a, b) => a + b, 0),
    lastWeek,
    budget,
    dailyBudget: budget !== null ? budget / 7 : null,
    today: days[days.length - 1] ?? 0,
  };
}
