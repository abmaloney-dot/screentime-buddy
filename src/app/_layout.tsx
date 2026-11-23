import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider, Stack, useRouter } from 'expo-router';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { AppState, View } from 'react-native';

import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { loadClock, onClockChange } from '@/lib/clock';
import { DB_NAME, migrate } from '@/lib/db';
import { evaluatePendingWeeks } from '@/lib/weekly';
import { loadThemePreference, ThemeProvider, useTheme } from '@/theme';

async function init(db: SQLiteDatabase) {
  await migrate(db);
  await loadClock(db); // restore a dev time skip before anything reads "now"
  await loadThemePreference(db); // so a saved dark theme doesn't flash light first
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DB_NAME} onInit={init}>
      <ThemeProvider>
        <ThemedStack />
        <GoalWatcher />
      </ThemeProvider>
    </SQLiteProvider>
  );
}

/**
 * Every screen is wrapped in ScreenBackdrop (theme background + design);
 * screens themselves stay transparent so it shows through. Headers, the tab
 * bar and cards stay solid, so text on them is crisp.
 */
function ThemedStack() {
  const { colors, scheme } = useTheme();
  // The navigators' own theme: without it they paint React Navigation's
  // default grey (#F2F2F2) behind screens, whatever the app theme is.
  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: 'transparent',
        card: colors.card,
        text: colors.text,
        border: colors.border,
        primary: colors.primary,
        notification: colors.danger,
      },
    };
  }, [colors, scheme]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <NavThemeProvider value={navTheme}>
        <Stack
          screenLayout={({ children }) => <ScreenBackdrop>{children}</ScreenBackdrop>}
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: 'transparent' },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="reward/[week]" options={{ presentation: 'modal', title: 'Weekly result' }} />
        </Stack>
      </NavThemeProvider>
    </View>
  );
}

/**
 * On launch, on return to the foreground, and after a dev time skip: judge
 * any finished weeks and pop up the newest result.
 */
function GoalWatcher() {
  const db = useSQLiteContext();
  const router = useRouter();

  useEffect(() => {
    const check = () =>
      evaluatePendingWeeks(db)
        .then((created) => {
          if (created.length > 0) {
            router.push({ pathname: '/reward/[week]', params: { week: created[0].week } });
          }
        })
        .catch(() => {}); // e.g. usage access not granted yet — the screens explain that

    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    const offClock = onClockChange(check);
    return () => {
      sub.remove();
      offClock();
    };
  }, [db, router]);

  return null;
}
