import Ionicons from '@expo/vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { HourlyChart } from '@/components/HourlyChart';
import { PermissionGate } from '@/components/PermissionGate';
import { TagPicker } from '@/components/TagPicker';
import { Card, ProgressBar, useSharedStyles } from '@/components/ui';
import { useFocusedData } from '@/hooks/useFocusedData';
import { getTagsBetween, setHourTag } from '@/lib/db';
import { TAGS, type TagId } from '@/lib/tags';
import { addDays, dayKey, formatDay, formatMinutes, hourBoundaries, today } from '@/lib/time';
import { usageSource } from '@/lib/usage';
import { getWeekProgress } from '@/lib/weekly';
import { spacing, useTheme } from '@/theme';

// Android keeps roughly a week of detailed events.
const OLDEST_OFFSET = -6;

export default function TodayScreen() {
  return (
    <PermissionGate>
      <DayView />
    </PermissionGate>
  );
}

function DayView() {
  const styles = useSharedStyles();
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const [offset, setOffset] = useState(0);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const day = addDays(today(), offset);
  const key = dayKey(day);

  const { data, error, reload } = useFocusedData(key, async () => {
    const [minutes, tagRows, progress] = await Promise.all([
      usageSource.getMinutes(hourBoundaries(day)),
      getTagsBetween(db, key, key),
      getWeekProgress(db),
    ]);
    const tags: Partial<Record<number, TagId>> = {};
    for (const row of tagRows) tags[row.hour] = row.tag;
    return { minutes, tags, progress };
  });
  const dailyBudget = offset === 0 ? data?.progress.dailyBudget ?? null : null;

  const total = data?.minutes.reduce((a, b) => a + b, 0) ?? 0;

  const onSelectTag = async (tag: TagId | null) => {
    if (selectedHour === null) return;
    await setHourTag(db, key, selectedHour, tag);
    setSelectedHour(null);
    reload();
  };

  // Minutes per tag for this day, e.g. "🍽️ Meal time 45m".
  const tagTotals = data
    ? TAGS.map((t) => ({
        tag: t,
        minutes: data.minutes.reduce((sum, m, h) => (data.tags[h] === t.id ? sum + m : sum), 0),
      })).filter((x) => x.minutes > 0)
    : [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable disabled={offset <= OLDEST_OFFSET} onPress={() => setOffset(offset - 1)} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={offset <= OLDEST_OFFSET ? colors.border : colors.text} />
        </Pressable>
        <Text style={[styles.body, { fontWeight: '700' }]}>{formatDay(day)}</Text>
        <Pressable disabled={offset >= 0} onPress={() => setOffset(offset + 1)} hitSlop={12}>
          <Ionicons name="chevron-forward" size={24} color={offset >= 0 ? colors.border : colors.text} />
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Card title="Screen time">
        <Text style={styles.big}>{formatMinutes(total)}</Text>
        {dailyBudget !== null ? (
          <View style={{ gap: spacing.xs }}>
            <ProgressBar value={total} max={dailyBudget} />
            <Text style={styles.muted}>
              {total <= dailyBudget
                ? `${formatMinutes(dailyBudget - total)} left of today’s share of your weekly goal (${formatMinutes(dailyBudget)})`
                : `${formatMinutes(total - dailyBudget)} over today’s share of your weekly goal (${formatMinutes(dailyBudget)})`}
            </Text>
          </View>
        ) : offset === 0 ? (
          <Text style={styles.muted}>No weekly goal yet. Pick one in the Goals tab.</Text>
        ) : null}
      </Card>

      <Card title="By hour">
        {data ? (
          <HourlyChart
            minutes={data.minutes}
            tags={data.tags}
            selectedHour={selectedHour}
            onPressHour={setSelectedHour}
          />
        ) : null}
        <Text style={styles.muted}>Tap an hour to label what you were doing.</Text>
      </Card>

      {tagTotals.length > 0 ? (
        <Card title="Labelled time">
          {tagTotals.map(({ tag, minutes }) => (
            <View key={tag.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.body}>
                <Text style={{ color: tag.color }}>●</Text> {tag.emoji} {tag.label}
              </Text>
              <Text style={styles.body}>{formatMinutes(minutes)}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <TagPicker
        hour={selectedHour}
        minutes={selectedHour !== null && data ? data.minutes[selectedHour] : 0}
        current={selectedHour !== null ? data?.tags[selectedHour] : undefined}
        onSelect={onSelectTag}
        onClose={() => setSelectedHour(null)}
      />
    </ScrollView>
  );
}
