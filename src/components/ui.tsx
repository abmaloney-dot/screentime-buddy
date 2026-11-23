import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, spacing, useTheme } from '@/theme';

export function Card({
  title,
  children,
  style,
}: {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useSharedStyles();
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const styles = useSharedStyles();
  const { colors } = useTheme();
  const ratio = max > 0 ? value / max : 0;
  const over = ratio > 1;
  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          { width: `${Math.min(ratio, 1) * 100}%`, backgroundColor: over ? colors.danger : colors.success },
        ]}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
}) {
  const styles = useSharedStyles();
  const ghost = variant === 'ghost';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        ghost ? styles.buttonGhost : styles.buttonPrimary,
        (pressed || disabled) && { opacity: 0.6 },
      ]}>
      <Text style={[styles.buttonText, ghost && styles.buttonGhostText]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const styles = useSharedStyles();
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && styles.segmentActive]}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Thumbs stay white on every theme, the usual switch convention.
const THUMB = '#FFFFFF';
// react-native-web colours an "on" thumb with its own web-only prop
// (default teal) and ignores thumbColor; native uses thumbColor. Pass both.
const webThumb = { activeThumbColor: THUMB } as object;

/** A Switch in the theme's colours, the same on web and native. */
export function ThemedSwitch({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: colors.primary, false: colors.border }}
      thumbColor={THUMB}
      {...webThumb}
    />
  );
}

/** Styles shared by every screen, rebuilt per theme: `const styles = useSharedStyles()`. */
export const useSharedStyles = makeStyles((c) =>
  StyleSheet.create({
    // Transparent: ScreenBackdrop draws the background colour and design.
    screen: { flex: 1 },
    content: { padding: spacing.lg, gap: spacing.lg },
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardTitle: { fontSize: 13, fontWeight: '700', color: c.muted, textTransform: 'uppercase' },
    big: { fontSize: 36, fontWeight: '800', color: c.text },
    body: { fontSize: 15, color: c.text },
    muted: { fontSize: 13, color: c.muted },
    error: { fontSize: 14, color: c.danger },
    track: { height: 10, borderRadius: 5, backgroundColor: c.border, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 5 },
    button: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center' },
    buttonPrimary: { backgroundColor: c.primary },
    buttonGhost: { backgroundColor: c.primarySoft },
    buttonText: { color: c.onPrimary, fontWeight: '700', fontSize: 15 },
    buttonGhostText: { color: c.primary },
    segmented: { flexDirection: 'row', backgroundColor: c.border, borderRadius: 10, padding: 3 },
    segment: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    segmentActive: { backgroundColor: c.card },
    segmentText: { color: c.muted, fontWeight: '600' },
    segmentTextActive: { color: c.text },
  }),
);
