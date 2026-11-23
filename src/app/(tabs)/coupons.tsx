import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CouponCard, couponState } from '@/components/CouponCard';
import { Card, styles } from '@/components/ui';
import { useFocusedData } from '@/hooks/useFocusedData';
import { findTier } from '@/lib/coupons';
import { getCoupons, getWeekResults, setCouponUsed } from '@/lib/db';
import { formatWeek, parseDayKey } from '@/lib/time';
import { colors, spacing } from '@/theme';

const STATE_ORDER = { active: 0, used: 1, expired: 2 };

export default function CouponsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { data, reload } = useFocusedData('coupons', async () => {
    const [coupons, results] = await Promise.all([getCoupons(db), getWeekResults(db)]);
    coupons.sort((a, b) => STATE_ORDER[couponState(a)] - STATE_ORDER[couponState(b)]);
    return { coupons, results };
  });

  const toggle = async (id: number, used: number) => {
    await setCouponUsed(db, id, !used);
    reload();
  };

  if (data && data.results.length === 0) {
    return (
      <View style={[styles.screen, s.empty]}>
        <Text style={{ fontSize: 48 }}>🎟️</Text>
        <Text style={[styles.body, { textAlign: 'center' }]}>
          No coupons yet. Pick a weekly goal in the Goals tab; when the week ends, cut your screen time enough
          and a coupon lands here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {data?.coupons.map((c) => (
        <CouponCard key={c.id} coupon={c} onToggleUsed={() => toggle(c.id, c.used)} />
      ))}

      {data ? (
        <Card title="Weekly results">
          {data.results.map((r) => {
            const earned = findTier(r.earned_tier);
            const down = r.change_pct < 0;
            return (
              <Pressable
                key={r.week}
                style={s.row}
                onPress={() => router.push({ pathname: '/reward/[week]', params: { week: r.week } })}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.body, { fontWeight: '600' }]}>{formatWeek(parseDayKey(r.week))}</Text>
                  <Text style={styles.muted}>
                    {down ? '↓' : '↑'} {Math.abs(r.change_pct).toFixed(1)}% vs the week before ·{' '}
                    {findTier(r.goal_tier)?.label ?? r.goal_tier} goal
                  </Text>
                </View>
                <Text style={{ fontWeight: '700', color: earned ? colors.success : colors.muted }}>
                  {earned ? `${earned.discountPct}% off` : 'No coupon'}
                </Text>
              </Pressable>
            );
          })}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
});
