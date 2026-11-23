import { StyleSheet, Text, View } from 'react-native';

import { findCategory, findTier } from '@/lib/coupons';
import type { Coupon } from '@/lib/db';
import { dayKey, parseDayKey, today } from '@/lib/time';
import { colors, spacing } from '@/theme';

import { Button } from './ui';

export function couponState(c: Coupon): 'active' | 'used' | 'expired' {
  if (c.used) return 'used';
  return c.expires_on < dayKey(today()) ? 'expired' : 'active';
}

/** A hypothetical discount coupon. Always labelled as a demo. */
export function CouponCard({ coupon, onToggleUsed }: { coupon: Coupon; onToggleUsed?: () => void }) {
  const category = findCategory(coupon.category);
  const tier = findTier(coupon.tier);
  const state = couponState(coupon);
  const expires = parseDayKey(coupon.expires_on).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <View style={[s.card, state !== 'active' && { opacity: 0.55 }]}>
      <View style={s.top}>
        <Text style={s.emoji}>{category.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.offer}>{category.offer(coupon.discount_pct)}</Text>
          <Text style={s.meta}>
            {tier?.label ?? coupon.tier} goal · {state === 'active' ? `valid until ${expires}` : state}
          </Text>
        </View>
      </View>
      <View style={s.codeBox}>
        <Text style={s.code}>{coupon.code}</Text>
      </View>
      <Text style={s.demo}>Demo coupon: not a real offer and can’t be redeemed.</Text>
      {onToggleUsed && state !== 'expired' ? (
        <Button label={coupon.used ? 'Mark as unused' : 'Mark as used'} variant="ghost" onPress={onToggleUsed} />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    padding: spacing.lg,
    gap: spacing.md,
  },
  top: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  emoji: { fontSize: 32 },
  offer: { fontSize: 17, fontWeight: '800', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  codeBox: { backgroundColor: colors.primarySoft, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  code: { fontSize: 18, fontWeight: '800', letterSpacing: 2, color: colors.primary, fontFamily: 'monospace' },
  demo: { fontSize: 11, color: colors.muted, textAlign: 'center' },
});
