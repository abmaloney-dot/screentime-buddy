import { Stack, useRouter } from 'expo-router';
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';

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

function ThemedStack() {
  const { colors, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="reward/[week]" options={{ presentation: 'modal', title: 'Weekly result' }} />
      </Stack>
    </>
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
