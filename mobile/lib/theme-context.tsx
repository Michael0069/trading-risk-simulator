import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getThemeMode, setThemeMode, type ThemeMode } from './theme';

export interface Palette {
  screen: string;
  card: string;
  cardSoft: string;
  border: string;
  borderSoft: string;
  text: string;
  textSoft: string;
  muted: string;
  mutedSoft: string;
  inputBg: string;
  inputBorder: string;
  panel: string;
  panelBorder: string;
  brand: string;
  brandStrong: string;
  green: string;
  greenBright: string;
  red: string;
  orange: string;
  danger: string;
  dangerBg: string;
  success: string;
  successBg: string;
  liveBg: string;
  liveText: string;
  tipBg: string;
  tipBorder: string;
  tipTitle: string;
  tipText: string;
  toggleOnBg: string;
  toggleWarnBg: string;
  toggleOffBg: string;
  toggleBorder: string;
  inactiveTabBg: string;
  inactiveTabText: string;
  buyBg: string;
  buyBorder: string;
  sellBg: string;
  buyText: string;
  sellText: string;
  orbOne: string;
  orbTwo: string;
}

const darkPalette: Palette = {
  screen: '#020617',
  card: '#0f172a',
  cardSoft: '#111827',
  border: '#1e293b',
  borderSoft: '#334155',
  text: '#f8fafc',
  textSoft: '#e2e8f0',
  muted: '#94a3b8',
  mutedSoft: '#cbd5e1',
  inputBg: '#111827',
  inputBorder: '#334155',
  panel: '#111827',
  panelBorder: '#334155',
  brand: '#38bdf8',
  brandStrong: '#0ea5e9',
  green: '#34d399',
  greenBright: '#22d3ee',
  red: '#fb7185',
  orange: '#f97316',
  danger: '#fecaca',
  dangerBg: '#450a0a',
  success: '#bbf7d0',
  successBg: '#052e16',
  liveBg: '#052e16',
  liveText: '#86efac',
  tipBg: '#082f49',
  tipBorder: '#0ea5e9',
  tipTitle: '#bae6fd',
  tipText: '#e0f2fe',
  toggleOnBg: '#0c4a6e',
  toggleWarnBg: '#7f1d1d',
  toggleOffBg: '#111827',
  toggleBorder: '#334155',
  inactiveTabBg: '#0f172a',
  inactiveTabText: '#cbd5e1',
  buyBg: '#065f46',
  buyBorder: '#10b981',
  sellBg: '#7f1d1d',
  buyText: '#34d399',
  sellText: '#fb7185',
  orbOne: 'rgba(14, 165, 233, 0.18)',
  orbTwo: 'rgba(16, 185, 129, 0.14)',
};

const lightPalette: Palette = {
  screen: '#f1f5f9',
  card: '#ffffff',
  cardSoft: '#f8fafc',
  border: '#e2e8f0',
  borderSoft: '#cbd5e1',
  text: '#0f172a',
  textSoft: '#334155',
  muted: '#64748b',
  mutedSoft: '#475569',
  inputBg: '#ffffff',
  inputBorder: '#cbd5e1',
  panel: '#ffffff',
  panelBorder: '#e2e8f0',
  brand: '#0284c7',
  brandStrong: '#0369a1',
  green: '#059669',
  greenBright: '#0891b2',
  red: '#e11d48',
  orange: '#ea580c',
  danger: '#b91c1c',
  dangerBg: '#fee2e2',
  success: '#166534',
  successBg: '#dcfce7',
  liveBg: '#dcfce7',
  liveText: '#166534',
  tipBg: '#e0f2fe',
  tipBorder: '#38bdf8',
  tipTitle: '#0c4a6e',
  tipText: '#075985',
  toggleOnBg: '#0c4a6e',
  toggleWarnBg: '#7f1d1d',
  toggleOffBg: '#f8fafc',
  toggleBorder: '#cbd5e1',
  inactiveTabBg: '#e2e8f0',
  inactiveTabText: '#334155',
  buyBg: '#065f46',
  buyBorder: '#10b981',
  sellBg: '#7f1d1d',
  buyText: '#059669',
  sellText: '#e11d48',
  orbOne: 'rgba(2, 132, 199, 0.16)',
  orbTwo: 'rgba(5, 150, 105, 0.12)',
};

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  palette: Palette;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggle: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    let active = true;
    getThemeMode().then((saved) => {
      if (active) {
        setModeState(saved);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      isDark: mode === 'dark',
      palette: mode === 'dark' ? darkPalette : lightPalette,
      setMode: async (next) => {
        setModeState(next);
        await setThemeMode(next);
      },
      toggle: async () => {
        const next = mode === 'dark' ? 'light' : 'dark';
        setModeState(next);
        await setThemeMode(next);
      },
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

export function pnlColor(value: number, isDark: boolean) {
  if (value >= 0) {
    return isDark ? '#34d399' : '#059669';
  }
  return isDark ? '#fb7185' : '#e11d48';
}
