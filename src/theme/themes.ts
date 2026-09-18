import { dark as darkTokens, light as lightTokens, palette } from './colors';

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
  success: string;
  warning: string;
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
  danger: palette.danger,
  success: '#22c55e',
  warning: '#f59e0b',
  bottomBarBg: lightTokens.cardBg,
  bottomBarBorder: lightTokens.cardBorder,
  chipBg: lightTokens.cardBg,
  chipBorder: palette.slate['300'],
  chipActiveBg: lightTokens.chipActiveBg,
  chipActiveBorder: lightTokens.chipActiveBorder,
  inputBg: lightTokens.cardBg,
  inputBorder: lightTokens.inputBorder,
  inputText: lightTokens.text,
  placeholder: palette.slate['400'],
  shadow: lightTokens.shadow,
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
  success: '#4ade80',
  warning: '#fbbf24',
  bottomBarBg: palette.slate['900'],
  bottomBarBorder: darkTokens.cardBorder,
  chipBg: darkTokens.cardBg,
  chipBorder: palette.slate['700'],
  chipActiveBg: darkTokens.chipActiveBg,
  chipActiveBorder: darkTokens.chipActiveBorder,
  inputBg: darkTokens.cardBg,
  inputBorder: darkTokens.inputBorder,
  inputText: darkTokens.text,
  placeholder: palette.slate['500'],
  shadow: darkTokens.shadow,
  statusBar: 'light',
  splashBg: darkTokens.splashBg,
};

export function themeForMode(mode: ThemeMode): AppTheme {
  return mode === 'dark' ? darkTheme : lightTheme;
}
