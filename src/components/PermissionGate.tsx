import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Text, View } from 'react-native';

import { usageSource } from '@/lib/usage';
import { spacing, useTheme } from '@/theme';

import { Button, Card, useSharedStyles } from './ui';

/**
 * Android's usage access is a "special" permission: there is no runtime
 * dialog, the user must flip a switch in Settings. We re-check whenever the
 * app comes back to the foreground, i.e. after they return from Settings.
 */
export function PermissionGate({ children }: { children: ReactNode }) {
  const styles = useSharedStyles();
  const { colors } = useTheme();
  const [granted, setGranted] = useState(() => usageSource.hasPermission());

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setGranted(usageSource.hasPermission());
    });
    return () => sub.remove();
  }, []);

  if (granted) {
    return (
      <>
        {usageSource.kind === 'demo' ? (
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              backgroundColor: colors.background,
            }}>
            <Text style={styles.muted}>
              Demo data: real screen time needs the Android development build.
            </Text>
          </View>
        ) : null}
        {children}
      </>
    );
  }

  return (
    <View style={[styles.screen, styles.content, { justifyContent: 'center' }]}>
      <Card title="One-time setup">
        <Text style={styles.body}>
          To read your screen time, Android needs you to allow{' '}
          <Text style={{ fontWeight: '700' }}>Usage access</Text> for Screentime Buddy.
        </Text>
        <Text style={styles.muted}>
          Your data never leaves this phone. Find the app in the list, switch it on, then come back.
        </Text>
        <Button label="Open Usage access settings" onPress={usageSource.openPermissionSettings} />
      </Card>
    </View>
  );
}
