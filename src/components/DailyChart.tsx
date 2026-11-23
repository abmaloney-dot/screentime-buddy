import { StyleSheet, Text, View } from 'react-native';

import { formatMinutes } from '@/lib/time';
import { makeStyles, useTheme } from '@/theme';

const CHART_HEIGHT = 150;

/** One bar per day, with a dashed line at the daily goal. */
export function DailyChart({
  days,
  goal,
}: {
  days: { label: string; minutes: number }[];
  goal: number | null;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const max = Math.max(60, goal ?? 0, ...days.map((d) => d.minutes)) * 1.1;
  const goalY = goal !== null ? (goal / max) * CHART_HEIGHT : null;

  return (
    <View>
      <View style={s.chart}>
        {goalY !== null ? (
          <View style={[s.goalLine, { bottom: goalY }]}>
            <Text style={s.goalLabel}>daily share {formatMinutes(goal!)}</Text>
          </View>
        ) : null}
        {days.map((d, i) => {
          const over = goal !== null && d.minutes > goal;
          return (
            <View key={i} style={s.slot}>
              <View
                style={[
                  s.bar,
                  {
                    height: Math.max(2, (d.minutes / max) * CHART_HEIGHT),
                    backgroundColor: over ? colors.danger : colors.bar,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={s.labels}>
        {days.map((d, i) => (
          <Text key={i} style={s.label} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT, gap: 4 },
  slot: { flex: 1, justifyContent: 'flex-end', height: '100%' },
  bar: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.success,
    zIndex: 1,
  },
  goalLabel: { position: 'absolute', right: 0, top: -16, fontSize: 11, color: c.success },
  labels: { flexDirection: 'row', gap: 4, marginTop: 4 },
  label: { flex: 1, fontSize: 10, color: c.muted, textAlign: 'center' },
  }),
);
