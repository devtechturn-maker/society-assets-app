/**
 * Society Assets design tokens.
 * Primary brand: Admin Panel #0F172A (sidebar / slate-900).
 * Edit colors.tokens.json, then run: npm run theme:sync.
 */
import tokens from './colors.tokens.json';

export const palette = tokens.palette;

export const light = {
  pageBg: tokens.light.pageBg,
  surface: tokens.light.surface,
  splashBg: tokens.light.splashBg,
  cardBg: palette.white,
  cardBorder: palette.slate['200'],
  text: palette.slate['900'],
  textMuted: palette.slate['500'],
  textSoft: palette.slate['600'],
  textOnDark: palette.slate['100'],
  textOnDarkMuted: palette.slate['300'],
  textOnDarkSoft: palette.slate['200'],
  accent: palette.navy['600'],
  accentGold: palette.gold['600'],
  headerGradient: [palette.navy['600'], palette.navy['500'], palette.navy['900']] as const,
  inputBorder: palette.slate['150'],
  shadow: tokens.light.shadow,
  navActiveBg: 'rgba(15, 23, 42, 0.12)',
  navActiveText: palette.navy['600'],
  navText: palette.slate['300'],
  accentSoft: 'rgba(15, 23, 42, 0.08)',
  chipActiveBg: 'rgba(15, 23, 42, 0.08)',
  chipActiveBorder: palette.navy['600'],
} as const;

export const dark = {
  pageBg: tokens.dark.pageBg,
  surface: tokens.dark.surface,
  splashBg: tokens.dark.splashBg,
  cardBg: '#1e293b',
  cardBorder: '#334155',
  text: palette.slate['100'],
  textMuted: palette.slate['400'],
  textSoft: palette.slate['300'],
  textOnDark: palette.slate['100'],
  textOnDarkMuted: palette.slate['400'],
  textOnDarkSoft: palette.slate['300'],
  accent: palette.gold['400'],
  accentGold: palette.gold['400'],
  headerGradient: [palette.navy['600'], palette.navy['500'], palette.navy['900']] as const,
  inputBorder: '#334155',
  shadow: palette.black,
  navActiveBg: 'rgba(255, 255, 255, 0.12)',
  navActiveText: palette.white,
  navText: palette.slate['400'],
  accentSoft: 'rgba(255, 255, 255, 0.1)',
  chipActiveBg: 'rgba(255, 255, 255, 0.1)',
  chipActiveBorder: palette.slate['400'],
} as const;

export const colors = {
  pageBg: palette.slate['50'],
  navy900: palette.navy['900'],
  navy800: palette.navy['800'],
  navy700: palette.navy['700'],
  navy600: palette.navy['600'],
  gold600: palette.gold['600'],
  gold500: palette.gold['500'],
  gold400: palette.gold['400'],
  textOnDark: palette.slate['100'],
  textOnDarkMuted: palette.slate['300'],
  textOnDarkSoft: palette.slate['200'],
  heading: palette.slate['900'],
  label: palette.slate['600'],
  muted: palette.slate['500'],
  border: palette.slate['150'],
  borderLight: palette.slate['200'],
  white: palette.white,
  error: palette.error,
  success: palette.success,
} as const;

export const brand = {
  navyDeep: palette.navy['900'],
  navy: palette.navy['600'],
  navyMid: palette.navy['500'],
  navyLight: palette.navy['700'],
  gold: palette.gold['500'],
  goldBright: palette.gold['400'],
  goldMuted: palette.accentMuted,
  textOnDark: palette.white,
  textMuted: palette.slate['300'],
  textSoft: palette.slate['400'],
  splashGradient: [palette.navy['900'], palette.navy['600'], palette.navy['500'], palette.navy['800']] as const,
} as const;

export function goldMutedAlpha(alpha = 0.22): string {
  return `rgba(15, 23, 42, ${alpha})`;
}
