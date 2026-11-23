import type { SQLiteDatabase } from 'expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { getSetting, setSetting } from '@/lib/db';

// Neutral base per mode. The accent keys (primary, primarySoft, onPrimary,
// bar) come from the chosen accent below.
const lightBase = {
  background: '#F6F7FB',
  card: '#FFFFFF',
  text: '#1F2433',
  muted: '#6B7285',
  border: '#E3E6EF',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  backdrop: 'rgba(0,0,0,0.3)',
};

const darkBase: typeof lightBase = {
  background: '#0F1117',
  card: '#1A1D27',
  text: '#E8EAF2',
  muted: '#9AA1B5',
  border: '#2C3140',
  success: '#4ADE80',
  successSoft: '#143322',
  danger: '#F87171',
  dangerSoft: '#3B1A1A',
  backdrop: 'rgba(0,0,0,0.6)',
};

type AccentShades = {
  primary: string;
  primarySoft: string;
  /** Text and icons drawn on top of `primary`. */
  onPrimary: string;
  /** Chart bars. */
  bar: string;
};

/**
 * Each accent has its own light and dark shades: a colour that reads well on
 * white is usually too dim or too loud on near-black. Pale accents (light
 * pink, light blue) carry dark text on their buttons; white wouldn't be legible.
 */
export const ACCENTS = {
  purple: {
    label: 'Purple',
    light: { primary: '#5B5BD6', primarySoft: '#E6E6FB', onPrimary: '#FFFFFF', bar: '#A5A6F6' },
    dark: { primary: '#8B8CF5', primarySoft: '#2A2B4D', onPrimary: '#0F1117', bar: '#6E70D9' },
  },
  lightPink: {
    label: 'Light pink',
    light: { primary: '#F48FB1', primarySoft: '#FDE7EF', onPrimary: '#3A0A1E', bar: '#F8BBD0' },
    dark: { primary: '#F8A5C2', primarySoft: '#3D2230', onPrimary: '#2A0A16', bar: '#C97A98' },
  },
  green: {
    label: 'Green',
    light: { primary: '#2E9E5B', primarySoft: '#DDF4E6', onPrimary: '#FFFFFF', bar: '#8FD6AC' },
    dark: { primary: '#5DD88F', primarySoft: '#173626', onPrimary: '#0F1117', bar: '#3FA36A' },
  },
  blue: {
    label: 'Blue',
    light: { primary: '#2563EB', primarySoft: '#DCE7FD', onPrimary: '#FFFFFF', bar: '#93B4F5' },
    dark: { primary: '#6EA0FF', primarySoft: '#1A2A4A', onPrimary: '#0F1117', bar: '#4A79D6' },
  },
  lightBlue: {
    label: 'Light blue',
    light: { primary: '#38BDF8', primarySoft: '#E0F4FD', onPrimary: '#062A3A', bar: '#8ED8F8' },
    dark: { primary: '#7DD3FC', primarySoft: '#14303D', onPrimary: '#062A3A', bar: '#3A9CC6' },
  },
  teal: {
    label: 'Teal',
    light: { primary: '#0D9488', primarySoft: '#D5F2EF', onPrimary: '#FFFFFF', bar: '#7DD3C8' },
    dark: { primary: '#2DD4BF', primarySoft: '#123532', onPrimary: '#0F1117', bar: '#1E9C8C' },
  },
  orange: {
    label: 'Orange',
    light: { primary: '#EA580C', primarySoft: '#FDE8DA', onPrimary: '#FFFFFF', bar: '#F7B38A' },
    dark: { primary: '#FB923C', primarySoft: '#3A2414', onPrimary: '#0F1117', bar: '#C46A2A' },
  },
} satisfies Record<string, { label: string; light: AccentShades; dark: AccentShades }>;

export type AccentId = keyof typeof ACCENTS;
export type Colors = typeof lightBase & AccentShades;
type Scheme = 'light' | 'dark';

// Every accent × mode palette built once, so each keeps a stable identity
// (makeStyles caches styles per palette object).
const PALETTES = Object.fromEntries(
  Object.entries(ACCENTS).map(([id, a]) => [
    id,
    { light: { ...lightBase, ...a.light }, dark: { ...darkBase, ...a.dark } },
  ]),
) as Record<AccentId, Record<Scheme, Colors>>;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export type ThemePreference = 'system' | 'light' | 'dark';
const PREFERENCE_KEY = 'theme';
const ACCENT_KEY = 'accent';

type Theme = {
  colors: Colors;
  scheme: Scheme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  accent: AccentId;
  setAccent: (a: AccentId) => void;
};

const ThemeContext = createContext<Theme | null>(null);

// Read during SQLiteProvider's onInit, before the first render, so a saved
// theme doesn't flash the default one first.
let initialPreference: ThemePreference = 'system';
let initialAccent: AccentId = 'purple';
export async function loadThemePreference(db: SQLiteDatabase) {
  const saved = await getSetting(db, PREFERENCE_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') initialPreference = saved;
  const accent = await getSetting(db, ACCENT_KEY);
  if (accent && accent in ACCENTS) initialAccent = accent as AccentId;
}

/** Must sit inside SQLiteProvider: the user's choices are saved in settings. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const system = useColorScheme(); // follows the OS / browser setting live
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const [accent, setAccentState] = useState<AccentId>(initialAccent);

  const value = useMemo<Theme>(() => {
    const scheme: Scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
    return {
      colors: PALETTES[accent][scheme],
      scheme,
      preference,
      setPreference: (p) => {
        setPreferenceState(p);
        setSetting(db, PREFERENCE_KEY, p);
      },
      accent,
      setAccent: (a) => {
        setAccentState(a);
        setSetting(db, ACCENT_KEY, a);
      },
    };
  }, [preference, accent, system, db]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The colours an accent would have in a given mode, for swatches and previews. */
export function accentShades(id: AccentId, scheme: Scheme): AccentShades {
  return ACCENTS[id][scheme];
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <ThemeProvider>');
  return theme;
}

/**
 * Themed StyleSheets: `const useStyles = makeStyles((c) => StyleSheet.create({...}))`
 * at module level, then `const s = useStyles()` in the component. Each palette's
 * styles are built once and reused.
 */
export function makeStyles<T>(factory: (c: Colors) => T): () => T {
  const cache = new Map<Colors, T>();
  return function useStyles() {
    const { colors } = useTheme();
    let styles = cache.get(colors);
    if (!styles) {
      styles = factory(colors);
      cache.set(colors, styles);
    }
    return styles;
  };
}
