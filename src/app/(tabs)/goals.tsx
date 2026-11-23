import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, ProgressBar, Segmented, styles } from '@/components/ui';
import { useFocusedData } from '@/hooks/useFocusedData';
import {
  CATEGORIES,
  CATEGORY_SETTING,
  TIERS,
  findCategory,
  type CategoryPreference,
  type TierId,
} from '@/lib/coupons';
import { getSetting, getWeekResults, setSetting, setWeeklyGoal } from '@/lib/db';
import { dayKey, formatMinutes, formatWeek } from '@/lib/time';
import { getWeekProgress } from '@/lib/weekly';
import { colors, spacing } from '@/theme';

export default function GoalsScreen() {
  const db = useSQLiteContext();
  const [draft, setDraft] = useState<TierId | null>(null);

  const { data, reload } = useFocusedData('goals', async () => {
    const [progress, results, category] = await Promise.all([
      getWeekProgress(db),
      getWeekResults(db),
      getSetting(db, CATEGORY_SETTING),
    ]);
    // Results are newest first, so the streak is the leading run of earned weeks.
    let streak = 0;
    while (streak < results.length && results[streak].earned_tier) streak++;
    return {
      progress,
      streak,
      coupons: results.filter((r) => r.earned_tier).length,
      category: (category ?? 'surprise') as CategoryPreference,
    };
  });

  const progress = data?.progress;
  const selected = draft ?? progress?.goal?.id ?? null;
  const dirty = selected !== null && selected !== progress?.goal?.id;

  const save = async () => {
    if (!progress || !selected) return;
    await setWeeklyGoal(db, dayKey(progress.weekStart), selected);
    setDraft(null);
    reload();
  };

  const setCategory = async (c: CategoryPreference) => {
    await setSetting(db, CATEGORY_SETTING, c);
    reload();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {progress ? (
        <Card title={`This week · ${formatWeek(progress.weekStart)}`}>
          {progress.budget !== null ? (
            <>
              <Text style={styles.big}>{formatMinutes(progress.soFar)}</Text>
              <ProgressBar value={progress.soFar} max={progress.budget} />
              <Text style={styles.muted}>
                {formatMinutes(progress.soFar)} of your {formatMinutes(progress.budget)} weekly budget, day{' '}
                {progress.daysIn} of 7. Last week: {formatMinutes(progress.lastWeek)}.
              </Text>
            </>
          ) : (
            <Text style={styles.body}>
              {progress.goal
                ? 'No screen time recorded last week, so there’s nothing to compare against yet.'
                : 'Pick a goal below. Each week is compared with the week before it.'}
            </Text>
          )}
        </Card>
      ) : null}

      <Card title="Weekly goal">
        <Text style={styles.muted}>Cut your screen time compared with last week. Bigger cuts earn bigger coupons.</Text>
        {TIERS.map((t) => {
          const active = t.id === selected;
          return (
            <Pressable key={t.id} onPress={() => setDraft(t.id)} style={[s.tier, active && s.tierActive]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.tierName, active && { color: colors.primary }]}>{t.label}</Text>
                <Text style={styles.muted}>
                  {t.reducePct}% less than last week
                  {progress && progress.lastWeek > 0
                    ? ` (under ${formatMinutes(progress.lastWeek * (1 - t.reducePct / 100))})`
                    : ''}
                </Text>
              </View>
              <View style={s.badge}>
                <Text style={s.badgeText}>{t.discountPct}% off</Text>
              </View>
            </Pressable>
          );
        })}
        <Button
          label={progress?.goal == null ? 'Start this goal' : dirty ? 'Switch goal' : 'Current goal ✓'}
          onPress={save}
          disabled={!selected || (!dirty && progress?.goal != null)}
        />
        <Text style={styles.muted}>
          Applies from this week. Finished weeks keep the goal they had. Reach your goal and you get its coupon;
          beat a bigger tier and you get that coupon instead. Fall short and there’s no coupon that week.
        </Text>
      </Card>

      <Card title="Coupon type">
        <Segmented
          options={[
            ...CATEGORIES.map((c) => ({ value: c.id as CategoryPreference, label: `${c.emoji} ${c.label}` })),
            { value: 'surprise' as CategoryPreference, label: '🎲' },
          ]}
          value={data?.category ?? 'surprise'}
          onChange={setCategory}
        />
        <Text style={styles.muted}>
          {data?.category && data.category !== 'surprise'
            ? `Coupons will be for ${findCategory(data.category).label.toLowerCase()}.`
            : 'Surprise me: a different kind of coupon each week.'}{' '}
          All coupons are hypothetical demos.
        </Text>
      </Card>

      {data ? (
        <Card title="Your record">
          <View style={s.stats}>
            <Stat label="weeks in a row" value={`${data.streak}🔥`} />
            <Stat label="coupons earned" value={String(data.coupons)} />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  tierActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tierName: { fontSize: 16, fontWeight: '700', color: colors.text },
  badge: { backgroundColor: colors.successSoft, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  badgeText: { color: colors.success, fontWeight: '800' },
  stats: { flexDirection: 'row' },
});
