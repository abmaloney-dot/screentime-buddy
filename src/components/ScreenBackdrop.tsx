import type { ReactNode } from 'react';
import { View } from 'react-native';

import { STRENGTHS } from '@/lib/backgrounds';
import { useTheme } from '@/theme';

import { PatternBackground } from './PatternBackground';

/**
 * Wraps every screen (as a navigator `screenLayout`): an opaque theme
 * background with the chosen design on top. It has to be per screen, not one
 * shared layer: navigators keep inactive screens rendered underneath the
 * active one, so a transparent screen would show the others through it.
 */
export function ScreenBackdrop({ children }: { children: ReactNode }) {
  const { colors, background, strength } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PatternBackground design={background} colors={colors} opacity={STRENGTHS[strength].opacity} />
      {children}
    </View>
  );
}
