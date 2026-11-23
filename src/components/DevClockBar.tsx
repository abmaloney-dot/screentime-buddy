import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { clock, DAY_MS, onClockChange, setClockOffset } from '@/lib/clock';
import { deleteSimulatedFuture } from '@/lib/db';
import { dayKey, startOfDay, startOfWeek } from '@/lib/time';
import { colors } from '@/theme';

/**
 * Developer-only time travel, shown in every tab header in dev builds.
 * Skipping moves the app clock forward; the goal check and all screens react
 * as if that time had really passed.
 */
export function DevClockBar() {
  const db = useSQLiteContext();
  const [, rerender] = useState(0);
  useEffect(() => onClockChange(() => rerender((n) => n + 1)), []);

  if (!__DEV__) return null;

  const offset = clock.offsetMs();
  const days = Math.round(offset / DAY_MS);
  const skip = (n: number) => setClockOffset(db, offset + n * DAY_MS);
  const reset = async () => {
    // The one place that wants the real time, not the app clock.
    const realToday = startOfDay(new Date());
    await deleteSimulatedFuture(db, dayKey(startOfWeek(realToday)), dayKey(realToday));
    await setClockOffset(db, 0);
  };

  return (
    <View style={s.bar}>
      {days > 0 ? <Text style={s.offset}>+{days}d</Text> : null}
      <Pill label="+1 day" onPress={() => skip(1)} />
      <Pill label="+1 week" onPress={() => skip(7)} />
      {offset !== 0 ? <Pill label="Reset" onPress={reset} /> : null}
    </View>
  );
}

function Pill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.pill, pressed && { opacity: 0.6 }]}>
      <Text style={s.pillText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 12 },
  offset: { fontSize: 12, fontWeight: '700', color: colors.danger },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.muted,
  },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.muted },
});
