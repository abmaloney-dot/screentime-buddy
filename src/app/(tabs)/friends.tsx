import { useSQLiteContext } from 'expo-sqlite';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, useSharedStyles, ThemedSwitch } from '@/components/ui';
import { useFocusedData } from '@/hooks/useFocusedData';
import { getSetting, setSetting } from '@/lib/db';
import { friendsSource, SHARE_SETTING } from '@/lib/friends';
import { DAY_MS } from '@/lib/clock';
import { getDayTotals, getWeekTotal } from '@/lib/days';
import { addDays, formatMinutes, formatWeek, startOfWeek, today } from '@/lib/time';
import { percentChange } from '@/lib/weekly';
import { makeStyles, spacing, useTheme } from '@/theme';

type Row = { id: string; name: string; avgPerDay: number; changePct: number; isMe: boolean };

export default function FriendsScreen() {
  const styles = useSharedStyles();
  const s = useStyles();
  const { colors } = useTheme();
  const db = useSQLiteContext();

  const { data, reload } = useFocusedData('friends', async () => {
    const sharing = (await getSetting(db, SHARE_SETTING)) === '1';
    // Friends' numbers are only loaded once the user has opted in.
    if (!sharing) return { sharing, rows: [] as Row[], period: null };

    // Compare finished days only: a half-over today would flatter whoever
    // looks early. With no finished day yet (Monday), show last week's final.
    const weekStart = startOfWeek(today());
    const finished = Math.round((today().getTime() - weekStart.getTime()) / DAY_MS);
    const periodStart = finished > 0 ? weekStart : addDays(weekStart, -7);
    const days = finished > 0 ? finished : 7;

    const [mine, previousWeek, friends] = await Promise.all([
      getDayTotals(db, periodStart, days),
      getWeekTotal(db, addDays(periodStart, -7)),
      friendsSource.getWeek(periodStart, days),
    ]);
    const myAvg = mine.reduce((a, b) => a + b, 0) / days;
    const me: Row = {
      id: 'me',
      name: 'You',
      avgPerDay: myAvg,
      changePct: percentChange(myAvg, previousWeek / 7),
      isMe: true,
    };
    const rows: Row[] = [
      me,
      ...friends.map((f) => ({
        id: f.id,
        name: f.name,
        avgPerDay: f.avgPerDay,
        changePct: percentChange(f.avgPerDay, f.lastWeekAvgPerDay),
        isMe: false,
      })),
    ].sort((a, b) => a.avgPerDay - b.avgPerDay);
    const period =
      finished > 0
        ? `This week · ${finished} ${finished === 1 ? 'day' : 'days'} so far`
        : `Last week · final (${formatWeek(periodStart)})`;
    return { sharing, rows, period };
  });

  const setSharing = async (on: boolean) => {
    await setSetting(db, SHARE_SETTING, on ? '1' : '0');
    reload();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <View style={s.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.body, { fontWeight: '700' }]}>Share my screen time with friends</Text>
            <Text style={styles.muted}>
              Friends see only your daily average and how it changed from last week. Never your hours or
              labels. Turn it off any time.
            </Text>
          </View>
          <ThemedSwitch value={data?.sharing ?? false} onValueChange={setSharing} />
        </View>
      </Card>

      {data && !data.sharing ? (
        <View style={s.locked}>
          <Text style={{ fontSize: 40 }}>🏆</Text>
          <Text style={[styles.body, { textAlign: 'center' }]}>
            The leaderboard is for friendly competition between friends who all share. Turn on sharing to
            join it.
          </Text>
        </View>
      ) : null}

      {data?.sharing && data.period ? (
        <Card title={`Leaderboard · ${data.period}`}>
          <Text style={styles.muted}>Lowest daily average wins. Friends are simulated in this prototype.</Text>
          {data.rows.map((r, i) => (
            <View key={r.id} style={[s.row, r.isMe && s.me]}>
              <Text style={s.rank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</Text>
              <Text style={[styles.body, { flex: 1, fontWeight: r.isMe ? '800' : '500' }]}>{r.name}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.body, { fontWeight: '700' }]}>{formatMinutes(r.avgPerDay)}/day</Text>
                <Text style={{ fontSize: 12, color: r.changePct <= 0 ? colors.success : colors.danger }}>
                  {r.changePct <= 0 ? '↓' : '↑'} {Math.abs(r.changePct).toFixed(0)}% vs last week
                </Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  locked: { alignItems: 'center', gap: spacing.md, paddingTop: 48, paddingHorizontal: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
  },
  me: { backgroundColor: c.primarySoft },
  rank: { width: 28, fontSize: 18, textAlign: 'center', color: c.muted },
}),
);
