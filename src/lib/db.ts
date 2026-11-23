import type { SQLiteDatabase } from 'expo-sqlite';

import type { TagId } from './tags';

export const DB_NAME = 'screentime.db';

export type HourTag = { day: string; hour: number; tag: TagId };

export type WeekResult = {
  week: string; // Monday's dayKey
  minutes: number;
  prev_minutes: number;
  change_pct: number; // negative = less screen time than the week before
  goal_tier: string;
  earned_tier: string | null;
  coupon_id: number | null;
};

export type Coupon = {
  id: number;
  week: string;
  tier: string;
  category: string;
  discount_pct: number;
  code: string;
  issued_on: string;
  expires_on: string;
  used: number; // SQLite has no boolean: 1 / 0
};

/** Runs once per app start via <SQLiteProvider onInit>. Bump user_version per schema change. */
export async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE hour_tags (
        day TEXT NOT NULL,
        hour INTEGER NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (day, hour)
      );
    `);
    version = 1;
  }

  if (version < 2) {
    // v1 judged daily limits with cat/puppy pictures; v2 judges weekly
    // reductions with coupons. The old tables have no v2 meaning.
    await db.execAsync(`
      DROP TABLE IF EXISTS goals;
      DROP TABLE IF EXISTS day_results;
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE weekly_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tier TEXT NOT NULL,
        effective_from TEXT NOT NULL
      );
      CREATE TABLE day_totals (day TEXT PRIMARY KEY, minutes REAL NOT NULL);
      CREATE TABLE week_results (
        week TEXT PRIMARY KEY,
        minutes REAL NOT NULL,
        prev_minutes REAL NOT NULL,
        change_pct REAL NOT NULL,
        goal_tier TEXT NOT NULL,
        earned_tier TEXT,
        coupon_id INTEGER
      );
      CREATE TABLE coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week TEXT NOT NULL,
        tier TEXT NOT NULL,
        category TEXT NOT NULL,
        discount_pct INTEGER NOT NULL,
        code TEXT NOT NULL,
        issued_on TEXT NOT NULL,
        expires_on TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0
      );
    `);
    version = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${version}`);
}

// ── Settings ────────────────────────────────────────────────────────────────

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}

// ── Tags ────────────────────────────────────────────────────────────────────

export async function getTagsBetween(db: SQLiteDatabase, fromDay: string, toDay: string) {
  return db.getAllAsync<HourTag>(
    'SELECT day, hour, tag FROM hour_tags WHERE day BETWEEN ? AND ?',
    fromDay,
    toDay,
  );
}

export async function setHourTag(db: SQLiteDatabase, day: string, hour: number, tag: TagId | null) {
  if (tag === null) {
    await db.runAsync('DELETE FROM hour_tags WHERE day = ? AND hour = ?', day, hour);
  } else {
    await db.runAsync(
      'INSERT OR REPLACE INTO hour_tags (day, hour, tag) VALUES (?, ?, ?)',
      day,
      hour,
      tag,
    );
  }
}

// ── Weekly goals ────────────────────────────────────────────────────────────
// Versioned by the week they start, so changing the goal never rewrites how
// earlier weeks were judged.

export async function getGoalForWeek(db: SQLiteDatabase, week: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ tier: string }>(
    'SELECT tier FROM weekly_goals WHERE effective_from <= ? ORDER BY effective_from DESC, id DESC LIMIT 1',
    week,
  );
  return row?.tier ?? null;
}

export async function getFirstGoalWeek(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ week: string | null }>(
    'SELECT MIN(effective_from) AS week FROM weekly_goals',
  );
  return row?.week ?? null;
}

export async function setWeeklyGoal(db: SQLiteDatabase, week: string, tier: string) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM weekly_goals WHERE effective_from = ?', week);
    await db.runAsync('INSERT INTO weekly_goals (tier, effective_from) VALUES (?, ?)', tier, week);
  });
}

// ── Day totals cache ────────────────────────────────────────────────────────
// Finished days only. Android keeps detailed events for about a week, but a
// week-over-week comparison needs 14 days, so totals are kept once seen.

export async function getCachedDayTotals(db: SQLiteDatabase, fromDay: string, toDay: string) {
  return db.getAllAsync<{ day: string; minutes: number }>(
    'SELECT day, minutes FROM day_totals WHERE day BETWEEN ? AND ?',
    fromDay,
    toDay,
  );
}

export async function cacheDayTotal(db: SQLiteDatabase, day: string, minutes: number) {
  await db.runAsync('INSERT OR REPLACE INTO day_totals (day, minutes) VALUES (?, ?)', day, minutes);
}

// ── Week results and coupons ────────────────────────────────────────────────

export async function getWeekResults(db: SQLiteDatabase, limit = 52) {
  return db.getAllAsync<WeekResult>('SELECT * FROM week_results ORDER BY week DESC LIMIT ?', limit);
}

export async function getWeekResult(db: SQLiteDatabase, week: string) {
  return db.getFirstAsync<WeekResult>('SELECT * FROM week_results WHERE week = ?', week);
}

export async function saveWeekResult(db: SQLiteDatabase, r: WeekResult) {
  await db.runAsync(
    'INSERT OR REPLACE INTO week_results (week, minutes, prev_minutes, change_pct, goal_tier, earned_tier, coupon_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    r.week,
    r.minutes,
    r.prev_minutes,
    r.change_pct,
    r.goal_tier,
    r.earned_tier,
    r.coupon_id,
  );
}

export async function insertCoupon(db: SQLiteDatabase, c: Omit<Coupon, 'id' | 'used'>) {
  const res = await db.runAsync(
    'INSERT INTO coupons (week, tier, category, discount_pct, code, issued_on, expires_on) VALUES (?, ?, ?, ?, ?, ?, ?)',
    c.week,
    c.tier,
    c.category,
    c.discount_pct,
    c.code,
    c.issued_on,
    c.expires_on,
  );
  return res.lastInsertRowId;
}

export async function getCoupons(db: SQLiteDatabase) {
  return db.getAllAsync<Coupon>('SELECT * FROM coupons ORDER BY issued_on DESC, id DESC');
}

export async function getCoupon(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Coupon>('SELECT * FROM coupons WHERE id = ?', id);
}

export async function setCouponUsed(db: SQLiteDatabase, id: number, used: boolean) {
  await db.runAsync('UPDATE coupons SET used = ? WHERE id = ?', used ? 1 : 0, id);
}

/**
 * Dev clock reset: forget everything created in the simulated future —
 * results and coupons for weeks that haven't really ended, goals that start
 * after the real current week, and labels on days after the real today.
 */
export async function deleteSimulatedFuture(db: SQLiteDatabase, realWeek: string, realDay: string) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM coupons WHERE week >= ?', realWeek);
    await db.runAsync('DELETE FROM week_results WHERE week >= ?', realWeek);
    await db.runAsync('DELETE FROM weekly_goals WHERE effective_from > ?', realWeek);
    await db.runAsync('DELETE FROM hour_tags WHERE day > ?', realDay);
  });
}
