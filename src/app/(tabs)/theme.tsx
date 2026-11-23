import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, ProgressBar, Segmented, useSharedStyles, ThemedSwitch } from '@/components/ui';
import {
  ACCENTS,
  makeStyles,
  paletteFor,
  spacing,
  useTheme,
  type AccentId,
  type Colors,
  type ThemePreference,
} from '@/theme';

const ACCENT_IDS = Object.keys(ACCENTS) as AccentId[];

/** The shades shown in the preview strip, lightest surface first. */
const SHADES: { key: keyof Colors; label: string }[] = [
  { key: 'background', label: 'Back' },
  { key: 'card', label: 'Card' },
  { key: 'border', label: 'Border' },
  { key: 'primarySoft', label: 'Soft' },
  { key: 'bar', label: 'Bars' },
  { key: 'primary', label: 'Accent' },
];

export default function ThemeScreen() {
  const styles = useSharedStyles();
  const s = useStyles();
  const { colors, scheme, preference, setPreference, accent, setAccent, tinted, setTinted } = useTheme();

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

      <Card title="Colour theme">
        <View style={s.grid}>
          {ACCENT_IDS.map((id) => {
            // Each tile is drawn in its own theme, so you see it before picking.
            const p = paletteFor(id, scheme, tinted);
            const active = id === accent;
            return (
              <Pressable
                key={id}
                onPress={() => setAccent(id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={ACCENTS[id].label}
                style={[
                  s.option,
                  { backgroundColor: p.background, borderColor: active ? p.primary : p.border },
                  active && s.optionActive,
                ]}>
                <View style={[s.swatch, { backgroundColor: p.primary }]}>
                  {active ? <Ionicons name="checkmark" size={20} color={p.onPrimary} /> : null}
                </View>
                <View style={s.dots}>
                  {[p.card, p.primarySoft, p.bar].map((c, i) => (
                    <View key={i} style={[s.dot, { backgroundColor: c, borderColor: p.border }]} />
                  ))}
                </View>
                <Text style={[s.optionLabel, { color: p.text }, active && { fontWeight: '700' }]} numberOfLines={1}>
                  {ACCENTS[id].label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={s.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.body, { fontWeight: '700' }]}>Tint the whole app</Text>
            <Text style={styles.muted}>
              Backgrounds, cards and borders take the theme’s colour. Off: neutral greys with coloured accents.
            </Text>
          </View>
          <ThemedSwitch value={tinted} onValueChange={setTinted} />
        </View>
      </Card>

      <Card title="Preview">
        <View style={s.strip}>
          {SHADES.map(({ key, label }) => (
            <View key={key} style={s.shade}>
              <View style={[s.shadeSwatch, { backgroundColor: colors[key] }]} />
              <Text style={s.shadeLabel}>{label}</Text>
            </View>
          ))}
        </View>
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
    },
    optionActive: { borderWidth: 3 },
    swatch: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    dots: { flexDirection: 'row', gap: 4 },
    dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
    optionLabel: { fontSize: 13 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
    strip: { flexDirection: 'row', gap: 6 },
    shade: { flex: 1, alignItems: 'center', gap: 4 },
    shadeSwatch: { alignSelf: 'stretch', height: 36, borderRadius: 8, borderWidth: 1, borderColor: c.border },
    shadeLabel: { fontSize: 11, color: c.muted },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 64 },
    bar: { flex: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  }),
);
