import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { DevClockBar } from '@/components/DevClockBar';
import { colors } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IconName; color: ColorValue; size: number }) {
  // Our tint colors are plain hex strings; Ionicons doesn't accept numeric colors.
  return <Ionicons name={name} color={typeof color === 'string' ? color : undefined} size={size} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarLabelStyle: { fontSize: 10 },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerRight: () => <DevClockBar />,
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
    </Tabs>
  );
}
