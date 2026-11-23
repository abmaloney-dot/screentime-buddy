import type { SQLiteDatabase } from 'expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { getSetting, setSetting } from '@/lib/db';

export type Colors = {
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primarySoft: string;
  /** Text and icons drawn on top of `primary`. */
  onPrimary: string;
  /** Chart bars. */
  bar: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  backdrop: string;
};
type Scheme = 'light' | 'dark';

/**
 * Each theme is a hue and a saturation; the app derives its shades from them.
 * `primary` / `onPrimary` stay hand-picked per mode: the main accent has to
 * look right and keep readable button text, which a formula doesn't guarantee
 * (pale accents like light pink and light blue need dark text on buttons).
 */
export const ACCENTS = {
  purple: {
    label: 'Purple', hue: 240, sat: 60,
    light: { primary: '#5B5BD6', onPrimary: '#FFFFFF' },
    dark: { primary: '#8B8CF5', onPrimary: '#0F1117' },
  },
  lightPink: {
    label: 'Light pink', hue: 340, sat: 75,
    light: { primary: '#F48FB1', onPrimary: '#3A0A1E' },
    dark: { primary: '#F8A5C2', onPrimary: '#2A0A16' },
  },
  green: {
    label: 'Green', hue: 145, sat: 45,
    light: { primary: '#2E9E5B', onPrimary: '#FFFFFF' },
    dark: { primary: '#5DD88F', onPrimary: '#0F1117' },
  },
  blue: {
    label: 'Blue', hue: 220, sat: 75,
    light: { primary: '#2563EB', onPrimary: '#FFFFFF' },
    dark: { primary: '#6EA0FF', onPrimary: '#0F1117' },
  },
  lightBlue: {
    label: 'Light blue', hue: 199, sat: 85,
    light: { primary: '#38BDF8', onPrimary: '#062A3A' },
    dark: { primary: '#7DD3FC', onPrimary: '#062A3A' },
  },
  teal: {
    label: 'Teal', hue: 174, sat: 60,
    light: { primary: '#0D9488', onPrimary: '#FFFFFF' },
    dark: { primary: '#2DD4BF', onPrimary: '#0F1117' },
  },
  orange: {
    label: 'Orange', hue: 24, sat: 80,
    light: { primary: '#EA580C', onPrimary: '#FFFFFF' },
    dark: { primary: '#FB923C', onPrimary: '#0F1117' },
  },
} satisfies Record<string, { label: string; hue: number; sat: number; light: object; dark: object }>;

export type AccentId = keyof typeof ACCENTS;

/** HSL (degrees, %, %) → #rrggbb. Hex keeps every platform happy. */
function hsl(h: number, s: number, l: number): string {
  const sat = Math.min(100, s) / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
}

// Status colours never change with the theme, so "over/under goal" always means the same.
const STATUS = {
  light: { success: '#16A34A', successSoft: '#DCFCE7', danger: '#DC2626', dangerSoft: '#FEE2E2', backdrop: 'rgba(0,0,0,0.3)' },
  dark: { success: '#4ADE80', successSoft: '#143322', danger: '#F87171', dangerSoft: '#3B1A1A', backdrop: 'rgba(0,0,0,0.6)' },
};

// The neutral look: grey surfaces, only the accent coloured.
const NEUTRAL = {
  light: { background: '#F6F7FB', card: '#FFFFFF', border: '#E3E6EF', text: '#1F2433', muted: '#6B7285' },
  dark: { background: '#0F1117', card: '#1A1D27', border: '#2C3140', text: '#E8EAF2', muted: '#9AA1B5' },
};

/**
 * The five shades every theme derives from its hue, per mode:
 * background → card → border → soft highlight → chart bars, plus slightly
 * hue-tinted text. Lightness steps are fixed so every theme keeps the same
 * contrast; only the hue and the strength of the tint differ.
 */
function buildPalette(id: AccentId, scheme: Scheme, tinted: boolean): Colors {
  const { hue: h, sat: s } = ACCENTS[id];
  const accent = ACCENTS[id][scheme];
  const shades =
    scheme === 'light'
      ? {
          background: hsl(h, s * 0.6, 95),
          card: hsl(h, s * 0.5, 99),
          border: hsl(h, s * 0.4, 87),
          primarySoft: hsl(h, s * 0.8, 91),
          bar: hsl(h, s * 0.7, 74),
          text: hsl(h, 25, 15),
          muted: hsl(h, 12, 37), // keeps ≥ 4.5:1 (WCAG AA) on every light surface
        }
      : {
          background: hsl(h, s * 0.35, 8),
          card: hsl(h, s * 0.3, 13),
          border: hsl(h, s * 0.25, 22),
          primarySoft: hsl(h, s * 0.4, 21),
          bar: hsl(h, s * 0.55, 55),
          text: hsl(h, 20, 92),
          muted: hsl(h, 12, 66),
        };
  const surfaces = tinted ? shades : { ...shades, ...NEUTRAL[scheme] };
  return { ...surfaces, ...accent, ...STATUS[scheme] };
}

const SCHEMES: Scheme[] = ['light', 'dark'];

// Every theme × mode × tint palette built once, so each keeps a stable
// identity (makeStyles caches styles per palette object).
const PALETTES = Object.fromEntries(
  (Object.keys(ACCENTS) as AccentId[]).map((id) => [
    id,
    Object.fromEntries(
      SCHEMES.map((scheme) => [
        scheme,
        { tinted: buildPalette(id, scheme, true), neutral: buildPalette(id, scheme, false) },
      ]),
    ),
  ]),
) as Record<AccentId, Record<Scheme, { tinted: Colors; neutral: Colors }>>;

/** A theme's palette in a given mode, for swatches and previews. */
export function paletteFor(id: AccentId, scheme: Scheme, tinted: boolean): Colors {
  return PALETTES[id][scheme][tinted ? 'tinted' : 'neutral'];
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export type ThemePreference = 'system' | 'light' | 'dark';
const PREFERENCE_KEY = 'theme';
const ACCENT_KEY = 'accent';
const TINT_KEY = 'tint';

type Theme = {
  colors: Colors;
  scheme: Scheme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  accent: AccentId;
  setAccent: (a: AccentId) => void;
  /** Whether backgrounds, cards and borders take the theme's hue too. */
  tinted: boolean;
  setTinted: (t: boolean) => void;
};

const ThemeContext = createContext<Theme | null>(null);

// Read during SQLiteProvider's onInit, before the first render, so a saved
// theme doesn't flash the default one first.
let initialPreference: ThemePreference = 'system';
let initialAccent: AccentId = 'purple';
let initialTinted = true;
export async function loadThemePreference(db: SQLiteDatabase) {
  const saved = await getSetting(db, PREFERENCE_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') initialPreference = saved;
  const accent = await getSetting(db, ACCENT_KEY);
  if (accent && accent in ACCENTS) initialAccent = accent as AccentId;
  initialTinted = (await getSetting(db, TINT_KEY)) !== '0';
}

/** Must sit inside SQLiteProvider: the user's choices are saved in settings. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const system = useColorScheme(); // follows the OS / browser setting live
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const [accent, setAccentState] = useState<AccentId>(initialAccent);
  const [tinted, setTintedState] = useState(initialTinted);

  const value = useMemo<Theme>(() => {
    const scheme: Scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
    return {
      colors: paletteFor(accent, scheme, tinted),
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
      tinted,
      setTinted: (t) => {
        setTintedState(t);
        setSetting(db, TINT_KEY, t ? '1' : '0');
      },
    };
  }, [preference, accent, tinted, system, db]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
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
