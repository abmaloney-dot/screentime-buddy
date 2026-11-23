import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScrollView, Text, View } from 'react-native';

import { CouponCard } from '@/components/CouponCard';
import { Button, Card, styles } from '@/components/ui';
import { useFocusedData } from '@/hooks/useFocusedData';
import { TIERS, findTier } from '@/lib/coupons';
import { getCoupon, getWeekResult } from '@/lib/db';
import { formatMinutes, formatWeek, parseDayKey } from '@/lib/time';
import { colors, spacing } from '@/theme';

export default function WeeklyResultModal() {
  const { week } = useLocalSearchParams<{ week: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { data } = useFocusedData(week, async () => {
    const result = await getWeekResult(db, week);
    const coupon = result?.coupon_id != null ? await getCoupon(db, result.coupon_id) : null;
    return { result, coupon };
  });

  const result = data?.result;
  if (!result) return null;
  const goal = findTier(result.goal_tier);
  const earned = findTier(result.earned_tier);
  const reduction = -result.change_pct;
  // The next tier up from what was earned (or from the goal, if nothing was).
  const next = TIERS.find((t) => t.reducePct > (earned ?? goal)!.reducePct);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { alignItems: 'stretch' }]}>
      <Text style={[styles.muted, { textAlign: 'center' }]}>{formatWeek(parseDayKey(result.week))}</Text>
      <Text style={[styles.big, { textAlign: 'center', color: earned ? colors.success : colors.text }]}>
        {earned ? 'Coupon earned! 🎉' : 'No coupon this week'}
      </Text>

      <Card>
        <Text style={styles.body}>
          {formatMinutes(result.minutes)} this week vs {formatMinutes(result.prev_minutes)} the week before:{' '}
          <Text style={{ fontWeight: '700', color: reduction > 0 ? colors.success : colors.danger }}>
            {reduction > 0 ? `${reduction.toFixed(1)}% less` : `${(-reduction).toFixed(1)}% more`}
          </Text>
          .
        </Text>
        <Text style={styles.muted}>
          Your goal was {goal?.label} ({goal?.reducePct}% less).
          {earned && earned.id !== goal?.id ? ` You beat it and reached ${earned.label}!` : ''}
        </Text>
      </Card>

      {data.coupon ? <CouponCard coupon={data.coupon} /> : null}

      <View style={{ gap: spacing.sm }}>
        {!earned ? (
          <Text style={[styles.body, { textAlign: 'center' }]}>
            A fresh week starts now. The Tips tab has ideas based on your busiest hours.
          </Text>
        ) : next ? (
          <Text style={[styles.muted, { textAlign: 'center' }]}>
            Cut {next.reducePct}% next week for a {next.discountPct}% coupon.
          </Text>
        ) : null}
        <Button label="Close" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}
