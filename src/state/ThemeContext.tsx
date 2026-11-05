// =============================================================================
// ThemeContext.tsx — Mode tampilan Terang / Gelap / Otomatis (ikut sistem)
// Port dari js/theme.js + aturan warna html.dark di index.html
// =============================================================================

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'auto';

const KEY = 'kk_theme';

export interface Palette {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  subtext: string;
  muted: string;
  border: string;
  borderStrong: string;
  divider: string;
  inputBg: string;
  inputBorder: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  onPrimary: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  navBg: string;
  overlay: string;
  shadow: string;
}

const LIGHT: Palette = {
  bg: '#f8fafc',
  card: '#ffffff',
  cardAlt: '#f8fafc',
  text: '#1e293b',
  subtext: '#64748b',
  muted: '#94a3b8',
  border: '#f1f5f9',
  borderStrong: '#e2e8f0',
  divider: '#f8fafc',
  inputBg: '#f8fafc',
  inputBorder: '#e2e8f0',
  primary: '#4f46e5',
  primaryDark: '#4338ca',
  primarySoft: 'rgba(99,102,241,0.12)',
  onPrimary: '#ffffff',
  success: '#10b981',
  successSoft: 'rgba(16,185,129,0.12)',
  danger: '#e11d48',
  dangerSoft: 'rgba(244,63,94,0.10)',
  warning: '#d97706',
  warningSoft: 'rgba(245,158,11,0.14)',
  info: '#0284c7',
  infoSoft: 'rgba(59,130,246,0.12)',
  navBg: 'rgba(255,255,255,0.97)',
  overlay: 'rgba(15,23,42,0.45)',
  shadow: '#000000',
};

const DARK: Palette = {
  bg: '#0b1120',
  card: '#172033',
  cardAlt: '#1e293b',
  text: '#e2e8f0',
  subtext: '#94a3b8',
  muted: '#64748b',
  border: '#263148',
  borderStrong: '#2f3b55',
  divider: '#1e293b',
  inputBg: '#1e293b',
  inputBorder: '#2f3b55',
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primarySoft: 'rgba(129,140,248,0.18)',
  onPrimary: '#ffffff',
  success: '#34d399',
  successSoft: 'rgba(16,185,129,0.16)',
  danger: '#fb7185',
  dangerSoft: 'rgba(244,63,94,0.16)',
  warning: '#fbbf24',
  warningSoft: 'rgba(245,158,11,0.16)',
  info: '#60a5fa',
  infoSoft: 'rgba(59,130,246,0.16)',
  navBg: 'rgba(23,32,51,0.97)',
  overlay: 'rgba(2,6,23,0.6)',
  shadow: '#000000',
};

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  c: Palette;
  systemDark: boolean;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('auto');

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((m) => {
        if (alive && (m === 'light' || m === 'dark' || m === 'auto')) setModeState(m);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  };

  const systemDark = systemScheme === 'dark';
  const isDark = mode === 'dark' || (mode === 'auto' && systemDark);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, isDark, c: isDark ? DARK : LIGHT, systemDark, setMode }),
    [mode, isDark, systemDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme harus dipakai di dalam ThemeProvider');
  return ctx;
}
