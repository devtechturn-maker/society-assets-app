import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getThemeMode, setThemeMode as persistThemeMode } from '../services/preferences';
import type { AppTheme } from './themes';
import { themeForMode, type ThemeMode } from './themes';

type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  ready: boolean;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getThemeMode().then((m) => {
      setModeState(m);
      setReady(true);
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    persistThemeMode(next).catch(() => undefined);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themeForMode(mode),
      mode,
      ready,
      toggleMode,
      setMode,
    }),
    [mode, ready, toggleMode, setMode]
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
