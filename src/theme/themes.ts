import { dark as darkTokens, light as lightTokens } from './colors';

export type ThemeMode = 'light' | 'dark';

export type AppTheme = {
  mode: ThemeMode;
  pageBg: string;
  headerGradient: readonly [string, string, string];
  cardBg: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  textSoft: string;
  accent: string;
  accentGold: string;
  accentSoft: string;
  navActiveBg: string;
  navActiveText: string;
  navText: string;
  divider: string;
  danger: string;
  bottomBarBg: string;
  bottomBarBorder: string;
  chipBg: string;
  chipBorder: string;
  chipActiveBg: string;
  chipActiveBorder: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  placeholder: string;
  shadow: string;
  statusBar: 'light' | 'dark';
  splashBg: string;
};

export const lightTheme: AppTheme = {
  mode: 'light',
  pageBg: lightTokens.pageBg,
  headerGradient: lightTokens.headerGradient,
  cardBg: lightTokens.cardBg,
  cardBorder: lightTokens.cardBorder,
  text: lightTokens.text,
  textMuted: lightTokens.textMuted,
  textSoft: lightTokens.textSoft,
  accent: lightTokens.accent,
  accentGold: lightTokens.accentGold,
  accentSoft: lightTokens.accentSoft,
  navActiveBg: lightTokens.navActiveBg,
  navActiveText: lightTokens.navActiveText,
  navText: lightTokens.navText,
  divider: lightTokens.cardBorder,
  danger: '#ef4444',
  bottomBarBg: lightTokens.cardBg,
  bottomBarBorder: lightTokens.cardBorder,
  chipBg: lightTokens.cardBg,
  chipBorder: '#cbd5e1',
  chipActiveBg: lightTokens.chipActiveBg,
  chipActiveBorder: lightTokens.chipActiveBorder,
  inputBg: lightTokens.cardBg,
  inputBorder: lightTokens.inputBorder,
  inputText: lightTokens.text,
  placeholder: '#94a3b8',
  shadow: lightTokens.text,
  statusBar: 'light',
  splashBg: lightTokens.splashBg,
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  pageBg: darkTokens.pageBg,
  headerGradient: darkTokens.headerGradient,
  cardBg: darkTokens.cardBg,
  cardBorder: darkTokens.cardBorder,
  text: darkTokens.text,
  textMuted: darkTokens.textMuted,
  textSoft: darkTokens.textSoft,
  accent: darkTokens.accent,
  accentGold: darkTokens.accentGold,
  accentSoft: darkTokens.accentSoft,
  navActiveBg: darkTokens.navActiveBg,
  navActiveText: darkTokens.navActiveText,
  navText: darkTokens.navText,
  divider: darkTokens.cardBorder,
  danger: '#f87171',
  bottomBarBg: '#111827',
  bottomBarBorder: darkTokens.cardBorder,
  chipBg: darkTokens.cardBg,
  chipBorder: '#334155',
  chipActiveBg: darkTokens.chipActiveBg,
  chipActiveBorder: darkTokens.chipActiveBorder,
  inputBg: darkTokens.cardBg,
  inputBorder: darkTokens.inputBorder,
  inputText: darkTokens.text,
  placeholder: '#64748b',
  shadow: darkTokens.shadow,
  statusBar: 'light',
  splashBg: darkTokens.splashBg,
};

export function themeForMode(mode: ThemeMode): AppTheme {
  return mode === 'dark' ? darkTheme : lightTheme;
}
