import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, ProgressBar, Segmented, useSharedStyles } from '@/components/ui';
import { ACCENTS, accentShades, makeStyles, spacing, useTheme, type AccentId, type ThemePreference } from '@/theme';

const ACCENT_IDS = Object.keys(ACCENTS) as AccentId[];

export default function ThemeScreen() {
  const styles = useSharedStyles();
  const s = useStyles();
  const { colors, scheme, preference, setPreference, accent, setAccent } = useTheme();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card title="Mode">
        <Segmented<ThemePreference>
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          value={preference}
          onChange={setPreference}
        />
        <Text style={styles.muted}>
          {preference === 'system'
            ? `Following your device: ${scheme} right now.`
            : `Always ${preference}, whatever your device uses.`}
        </Text>
      </Card>

      <Card title="Accent colour">
        <View style={s.grid}>
          {ACCENT_IDS.map((id) => {
            const shade = accentShades(id, scheme);
            const active = id === accent;
            return (
              <Pressable
                key={id}
                onPress={() => setAccent(id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={ACCENTS[id].label}
                style={[s.option, active && { borderColor: shade.primary, backgroundColor: shade.primarySoft }]}>
                <View style={[s.swatch, { backgroundColor: shade.primary }]}>
                  {active ? <Ionicons name="checkmark" size={20} color={shade.onPrimary} /> : null}
                </View>
                <Text style={[s.optionLabel, active && { fontWeight: '700' }]} numberOfLines={1}>
                  {ACCENTS[id].label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card title="Preview">
        <Text style={styles.body}>Buttons, progress and charts use your accent.</Text>
        <ProgressBar value={2} max={3} />
        <View style={s.bars}>
          {[0.35, 0.6, 0.45, 0.9, 0.7, 0.5, 0.8].map((h, i) => (
            <View key={i} style={[s.bar, { height: 64 * h, backgroundColor: colors.bar }]} />
          ))}
        </View>
        <Button label="Primary button" onPress={() => {}} />
        <Button label="Secondary button" variant="ghost" onPress={() => {}} />
      </Card>
    </ScrollView>
  );
}

const useStyles = makeStyles((c) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    option: {
      // Fixed share, no flexGrow: a lone tile on the last row stays tile-sized.
      width: '31%',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: c.border,
    },
    swatch: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    optionLabel: { fontSize: 13, color: c.text },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 64 },
    bar: { flex: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  }),
);
