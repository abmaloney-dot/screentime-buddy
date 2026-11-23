import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { DailyChart } from '@/components/DailyChart';
import { PermissionGate } from '@/components/PermissionGate';
import { Card, Segmented, styles } from '@/components/ui';
import { useFocusedData } from '@/hooks/useFocusedData';
import { getTagsBetween } from '@/lib/db';
import { averageByHour, mostActiveHours, slopePerDay } from '@/lib/stats';
import { addDays, dayKey, formatHour, formatMinutes, hourBoundaries, today as getToday } from '@/lib/time';
import { usageSource } from '@/lib/usage';
import { getWeekProgress } from '@/lib/weekly';
import { colors, spacing } from '@/theme';

export default function TrendsScreen() {
  return (
    <PermissionGate>
      <Trends />
    </PermissionGate>
  );
}

function Trends() {
  const db = useSQLiteContext();
  const [range, setRange] = useState<7 | 14>(7);

  const { data, error } = useFocusedData(String(range), async () => {
    // Completed days only (yesterday and back), so a half-finished today
    // doesn't drag the averages down.
    const today = getToday();
    const first = addDays(today, -range);
    const days = Array.from({ length: range }, (_, i) => addDays(first, i));

    // One native call: every hour of every day, then sliced into days.
    const boundaries = days.flatMap((d, i) => {
      const b = hourBoundaries(d);
      return i < days.length - 1 ? b.slice(0, 24) : b;
    });
    const flat = await usageSource.getMinutes(boundaries);
    const hourly = days.map((_, i) => flat.slice(i * 24, i * 24 + 24));

    const tagRows = await getTagsBetween(db, dayKey(first), dayKey(addDays(today, -1)));
    const tagsByDay = days.map((d) => {
      const key = dayKey(d);
      const tags: Partial<Record<number, string>> = {};
      for (const row of tagRows) if (row.day === key) tags[row.hour] = row.tag;
      return tags;
    });

    return {
      days,
      totals: hourly.map((h) => h.reduce((a, b) => a + b, 0)),
      hourly,
      tagsByDay,
      // The dashed line: this week's daily share of the weekly goal.
      goal: (await getWeekProgress(db)).dailyBudget,
    };
  });

  const avg = data ? data.totals.reduce((a, b) => a + b, 0) / data.totals.length : 0;
  const slope = data ? slopePerDay(data.totals) : 0;
  const hourAvg = data ? averageByHour(data.hourly) : [];
  const peak = Math.max(1, ...hourAvg);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Segmented
        options={[
          { value: 7, label: 'Last 7 days' },
          { value: 14, label: 'Last 14 days' },
        ]}
        value={range}
        onChange={setRange}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {data ? (
        <>
          <Card title="Daily screen time">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.big}>{formatMinutes(avg)}</Text>
                <Text style={styles.muted}>daily average</Text>
              </View>
              <TrendBadge slope={slope} />
            </View>
            <DailyChart
              days={data.days.map((d, i) => ({
                label: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
                minutes: data.totals[i],
              }))}
              goal={data.goal}
            />
          </Card>

          <Card title="Most active hours">
            <View style={s.heat}>
              {hourAvg.map((m, h) => (
                <View
                  key={h}
                  style={[s.heatCell, { backgroundColor: colors.primary, opacity: 0.08 + 0.92 * (m / peak) }]}
                />
              ))}
            </View>
            <View style={s.heatAxis}>
              {[0, 6, 12, 18, 23].map((h) => (
                <Text key={h} style={styles.muted}>
                  {String(h).padStart(2, '0')}
                </Text>
              ))}
            </View>
            {mostActiveHours(data.hourly, data.tagsByDay).map((a, i) => (
              <View key={a.hour} style={s.row}>
                <Text style={[styles.body, { fontWeight: '700', width: 22 }]}>{i + 1}.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.body}>
                    {formatHour(a.hour)}–{formatHour((a.hour + 1) % 24)} · avg {formatMinutes(a.avgMinutes)}
                  </Text>
                  <Text style={styles.muted}>
                    {a.topTag
                      ? `mostly ${a.topTag.tag.emoji} ${a.topTag.tag.label} (${a.topTag.days} of ${range} days)`
                      : 'Not labelled yet. Tag it on the Today tab.'}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

function TrendBadge({ slope }: { slope: number }) {
  // Under ±3 min/day is noise, not a trend.
  const [label, color, bg] =
    slope <= -3
      ? [`↓ ${formatMinutes(-slope)}/day`, colors.success, colors.successSoft]
      : slope >= 3
        ? [`↑ ${formatMinutes(slope)}/day`, colors.danger, colors.dangerSoft]
        : ['→ steady', colors.muted, colors.border];
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={{ color, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  heat: { flexDirection: 'row', gap: 2 },
  heatCell: { flex: 1, height: 28, borderRadius: 4 },
  heatAxis: { flexDirection: 'row', justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: spacing.sm },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
});
