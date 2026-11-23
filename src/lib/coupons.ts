// Weekly goal tiers and the (hypothetical) coupons they unlock. Nothing here is
// a real offer: coupons are marked as demo and their codes aren't redeemable.

export const TIERS = [
  { id: 'gentle', label: 'Gentle', reducePct: 3, discountPct: 5 },
  { id: 'steady', label: 'Steady', reducePct: 5, discountPct: 10 },
  { id: 'bold', label: 'Bold', reducePct: 10, discountPct: 20 },
] as const;

export type Tier = (typeof TIERS)[number];
export type TierId = Tier['id'];

export function findTier(id: string | null | undefined): Tier | undefined {
  return TIERS.find((t) => t.id === id);
}

/**
 * The tier earned for a week: the highest tier whose reduction was reached,
 * but only if it's at least the tier the user committed to.
 * `changePct` is negative when screen time went down.
 */
export function earnedTier(goal: Tier, changePct: number): Tier | null {
  const reduction = -changePct;
  const reached = TIERS.filter((t) => reduction >= t.reducePct && t.reducePct >= goal.reducePct);
  return reached.at(-1) ?? null;
}

export const CATEGORIES = [
  { id: 'gym', label: 'Gym', emoji: '🏋️', offer: (pct: number) => `${pct}% off a gym membership` },
  { id: 'groceries', label: 'Groceries', emoji: '🛒', offer: (pct: number) => `${pct}% off your grocery shop` },
  { id: 'amazon', label: 'Amazon', emoji: '📦', offer: (pct: number) => `${pct}% off an Amazon order` },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export type CategoryPreference = CategoryId | 'surprise';
export const CATEGORY_SETTING = 'coupon_category';

export function findCategory(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** "Surprise me" picks a category per week, deterministically. */
export function pickCategory(pref: string | null, week: string): CategoryId {
  const chosen = CATEGORIES.find((c) => c.id === pref);
  return chosen ? chosen.id : CATEGORIES[hash(week) % CATEGORIES.length].id;
}

export function couponCode(week: string, tier: Tier, category: CategoryId): string {
  const suffix = hash(`${week}-${category}`).toString(36).toUpperCase().slice(0, 4).padStart(4, '0');
  return `DEMO-${tier.discountPct}${category.slice(0, 3).toUpperCase()}-${suffix}`;
}

export const COUPON_VALID_DAYS = 30;
