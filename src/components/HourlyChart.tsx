import { Pressable, StyleSheet, Text, View } from 'react-native';

import { findTag, type TagId } from '@/lib/tags';
import { makeStyles, useTheme } from '@/theme';

const CHART_HEIGHT = 140;

/** 24 bars, one per hour, each colored by the activity tag the user gave it. */
export function HourlyChart({
  minutes,
  tags,
  selectedHour,
  onPressHour,
}: {
  minutes: number[];
  tags: Partial<Record<number, TagId>>;
  selectedHour?: number | null;
  onPressHour?: (hour: number) => void;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View>
      <View style={s.bars}>
        {minutes.map((m, hour) => {
          const tag = findTag(tags[hour]);
          // An hour holds at most 60 minutes, so that's a natural fixed scale.
          const height = Math.max(2, (Math.min(m, 60) / 60) * CHART_HEIGHT);
          return (
            <Pressable
              key={hour}
              style={s.slot}
              onPress={() => onPressHour?.(hour)}
              hitSlop={{ top: 8, bottom: 8 }}>
              <View
                style={[
                  s.bar,
                  { height, backgroundColor: tag?.color ?? colors.bar },
                  selectedHour === hour && s.selected,
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={s.axis}>
        {[0, 6, 12, 18, 23].map((h) => (
          <Text key={h} style={s.axisLabel}>
            {String(h).padStart(2, '0')}
          </Text>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT, gap: 2 },
  slot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  selected: { borderWidth: 2, borderColor: c.text },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisLabel: { fontSize: 11, color: c.muted },
  }),
);
