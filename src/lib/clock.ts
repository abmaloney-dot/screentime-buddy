import type { SQLiteDatabase } from 'expo-sqlite';

import { getSetting, setSetting } from './db';

/**
 * The app's single source of "now". Developer tools can move it forward to
 * test day/week rollovers; every screen and the goal check read time from
 * here, so a skip exercises the same code paths a real week would.
 * Never call `new Date()` / `Date.now()` for "now" elsewhere in the app.
 */
const OFFSET_KEY = 'dev_clock_offset_ms';
export const DAY_MS = 86_400_000;

let offsetMs = 0;
const listeners = new Set<() => void>();

export const clock = {
  now: () => Date.now() + offsetMs,
  date: () => new Date(Date.now() + offsetMs),
  offsetMs: () => offsetMs,
};

/** Subscribe to clock jumps; returns an unsubscribe function. */
export function onClockChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Called once at startup (SQLiteProvider onInit) to restore a saved offset. */
export async function loadClock(db: SQLiteDatabase) {
  offsetMs = Number(await getSetting(db, OFFSET_KEY)) || 0;
}

export async function setClockOffset(db: SQLiteDatabase, ms: number) {
  offsetMs = ms;
  await setSetting(db, OFFSET_KEY, String(ms));
  listeners.forEach((l) => l());
}
