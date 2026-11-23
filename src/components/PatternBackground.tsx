import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { BACKGROUNDS, type BackgroundId } from '@/lib/backgrounds';
import type { Colors } from '@/theme';

/**
 * Draws a background design in the theme's colours: each mask layer gets a
 * tintColor. One layer uses the chart-bar shade; three-tone designs use
 * soft → bar → accent, so they keep a light, middle and strong tone.
 */
export function PatternBackground({
  design,
  colors,
  opacity,
  style,
}: {
  design: BackgroundId;
  colors: Colors;
  opacity: number;
  style?: StyleProp<ViewStyle>;
}) {
  const layers = BACKGROUNDS[design].layers;
  if (layers.length === 0) return null;
  const tones = layers.length === 1 ? [colors.bar] : [colors.primarySoft, colors.bar, colors.primary];

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }, style]}>
      {layers.map((source, i) => (
        <Image
          key={i}
          source={source}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', tintColor: tones.at(i) }]}
        />
      ))}
    </View>
  );
}
