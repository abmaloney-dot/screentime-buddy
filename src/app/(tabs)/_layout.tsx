import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { View, type ColorValue } from 'react-native';

import { DevClockBar } from '@/components/DevClockBar';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IconName; color: ColorValue; size: number }) {
  // Our tint colors are plain hex strings; Ionicons doesn't accept numeric colors.
  return <Ionicons name={name} color={typeof color === 'string' ? color : undefined} size={size} />;
}

function HeaderActions() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 12 }}>
      <DevClockBar />
      <ThemeToggle />
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenLayout={({ children }) => <ScreenBackdrop>{children}</ScreenBackdrop>}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 10 },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: 'transparent' }, // ScreenBackdrop draws background + design
        headerRight: () => <HeaderActions />,
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Today', tabBarIcon: (p) => <TabIcon name="today-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="trends"
        options={{ title: 'Trends', tabBarIcon: (p) => <TabIcon name="trending-up-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="tips"
        options={{ title: 'Tips', tabBarIcon: (p) => <TabIcon name="bulb-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="goals"
        options={{ title: 'Goals', tabBarIcon: (p) => <TabIcon name="flag-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="coupons"
        options={{ title: 'Coupons', tabBarIcon: (p) => <TabIcon name="pricetag-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="friends"
        options={{ title: 'Friends', tabBarIcon: (p) => <TabIcon name="people-outline" {...p} /> }}
      />
      <Tabs.Screen
        name="theme"
        options={{ title: 'Theme', tabBarIcon: (p) => <TabIcon name="color-palette-outline" {...p} /> }}
      />
    </Tabs>
  );
}
