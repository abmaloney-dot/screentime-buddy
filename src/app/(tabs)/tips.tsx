import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PermissionGate } from '@/components/PermissionGate';
import { Button, Card, useSharedStyles } from '@/components/ui';
import { useFocusedData } from '@/hooks/useFocusedData';
import { getTagsBetween } from '@/lib/db';
import { buildTips, unlabelledBusyHours } from '@/lib/tips';
import { addDays, dayKey, formatHour, hourBoundaries, today } from '@/lib/time';
import { usageSource } from '@/lib/usage';
import { makeStyles, spacing } from '@/theme';

const DAYS = 7;

export default function TipsScreen() {
  return (
    <PermissionGate>
      <Tips />
    </PermissionGate>
  );
}

function Tips() {
  const styles = useSharedStyles();
  const s = useStyles();
  const db = useSQLiteContext();
  const router = useRouter();

  const { data, error } = useFocusedData('tips', async () => {
    // The last 7 finished days, hour by hour, in one native call.
    const first = addDays(today(), -DAYS);
    const days = Array.from({ length: DAYS }, (_, i) => addDays(first, i));
    const boundaries = days.flatMap((d, i) => (i < DAYS - 1 ? hourBoundaries(d).slice(0, 24) : hourBoundaries(d)));
    const flat = await usageSource.getMinutes(boundaries);
    const hourly = days.map((_, i) => flat.slice(i * 24, i * 24 + 24));

    const tagRows = await getTagsBetween(db, dayKey(first), dayKey(addDays(today(), -1)));
    const tagsByDay = days.map((d) => {
      const key = dayKey(d);
      const tags: Partial<Record<number, string>> = {};
      for (const row of tagRows) if (row.day === key) tags[row.hour] = row.tag;
      return tags;
    });
    return { tips: buildTips(hourly, tagsByDay), unlabelled: unlabelledBusyHours(hourly, tagsByDay) };
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.muted}>Based on your last {DAYS} days and the labels you gave your hours.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {data?.tips.map((tip, i) => (
        <Card key={tip.id} style={i === 0 ? s.top : undefined}>
          <View style={s.head}>
            <Text style={s.emoji}>{tip.emoji}</Text>
            <Text style={s.title}>{tip.title}</Text>
          </View>
          <Text style={styles.muted}>{tip.reason}</Text>
          <Text style={styles.body}>{tip.action}</Text>
        </Card>
      ))}

      {data && data.tips.length === 0 ? (
        <Card>
          <Text style={styles.body}>No strong patterns in the last week. Nice work.</Text>
        </Card>
      ) : null}

      {data && data.unlabelled.length > 0 ? (
        <Card title="Get more specific tips">
          <Text style={styles.body}>
            Your busiest unlabelled hours are {data.unlabelled.map(formatHour).join(', ')}. Label what you
            usually do then, like meals or bedtime, and the tips will target it.
          </Text>
          <Button label="Label hours on Today" variant="ghost" onPress={() => router.navigate('/')} />
        </Card>
      ) : null}
    </ScrollView>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
  top: { borderColor: c.primary, borderWidth: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emoji: { fontSize: 24 },
  title: { fontSize: 17, fontWeight: '800', color: c.text, flex: 1 },
}),
);
