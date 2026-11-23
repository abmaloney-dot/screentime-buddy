import { addDays, dayKey } from './time';

export const SHARE_SETTING = 'share_with_friends';

export type FriendWeek = {
  id: string;
  name: string;
  /** Average minutes per day over the requested period. */
  avgPerDay: number;
  /** Average minutes per day over the 7 days before the period. */
  lastWeekAvgPerDay: number;
};

/**
 * Where friends' numbers come from. A real version needs a backend: the user
 * uploads their own weekly averages only while sharing is on, and receives
 * friends who share too. The prototype uses simulated friends.
 */
export interface FriendsSource {
  kind: 'demo';
  getWeek(periodStart: Date, days: number): Promise<FriendWeek[]>;
}

// Fictional people with different habits (base minutes per day).
const DEMO_FRIENDS = [
  { id: 'alex', name: 'Alex', base: 190 },
  { id: 'sam', name: 'Sam', base: 260 },
  { id: 'jordan', name: 'Jordan', base: 150 },
  { id: 'riley', name: 'Riley', base: 320 },
  { id: 'casey', name: 'Casey', base: 225 },
];

function noise(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

function demoDay(friend: (typeof DEMO_FRIENDS)[number], day: Date): number {
  return friend.base * (0.7 + noise(`${friend.id}-${dayKey(day)}`) * 0.6);
}

function average(friend: (typeof DEMO_FRIENDS)[number], start: Date, days: number): number {
  let total = 0;
  for (let i = 0; i < days; i++) total += demoDay(friend, addDays(start, i));
  return total / days;
}

const demoFriends: FriendsSource = {
  kind: 'demo',
  async getWeek(periodStart, days) {
    return DEMO_FRIENDS.map((f) => ({
      id: f.id,
      name: f.name,
      avgPerDay: average(f, periodStart, days),
      lastWeekAvgPerDay: average(f, addDays(periodStart, -7), 7),
    }));
  },
};

export const friendsSource: FriendsSource = demoFriends;
