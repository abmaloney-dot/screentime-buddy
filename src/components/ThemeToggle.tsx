import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';

import { useTheme, type ThemePreference } from '@/theme';

const NEXT: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' };
const ICON = { system: 'contrast-outline', light: 'sunny-outline', dark: 'moon-outline' } as const;
const LABEL = { system: 'Theme: follow system', light: 'Theme: light', dark: 'Theme: dark' };

/** Header button cycling System → Light → Dark. The icon shows the current choice. */
export function ThemeToggle() {
  const { preference, setPreference, colors } = useTheme();
  return (
    <Pressable
      onPress={() => setPreference(NEXT[preference])}
      accessibilityRole="button"
      accessibilityLabel={LABEL[preference]}
      hitSlop={8}
      style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}>
      <Ionicons name={ICON[preference]} size={20} color={colors.text} />
    </Pressable>
  );
}
