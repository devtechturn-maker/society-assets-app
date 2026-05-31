/**
 * Society Assets design tokens.
 * Edit colors.tokens.json (single source), then run: npm run theme:sync (in society-assets-ui).
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
  accent: palette.navy['800'],
  accentGold: palette.gold['600'],
  headerGradient: [palette.navy['700'], palette.navy['800'], palette.navy['900']] as const,
  inputBorder: palette.slate['150'],
  shadow: tokens.light.shadow,
  navActiveBg: 'rgba(16, 185, 129, 0.2)',
  navActiveText: '#047857',
  navText: palette.slate['300'],
  accentSoft: 'rgba(16, 185, 129, 0.15)',
  chipActiveBg: 'rgba(16, 185, 129, 0.12)',
  chipActiveBorder: '#10b981',
} as const;

export const dark = {
  pageBg: tokens.dark.pageBg,
  surface: tokens.dark.surface,
  splashBg: tokens.dark.splashBg,
  cardBg: '#151f33',
  cardBorder: '#2a3a55',
  text: palette.slate['100'],
  textMuted: palette.slate['400'],
  textSoft: palette.slate['300'],
  textOnDark: palette.slate['100'],
  textOnDarkMuted: palette.slate['400'],
  textOnDarkSoft: palette.slate['300'],
  accent: '#3b82f6',
  accentGold: palette.gold['500'],
  headerGradient: ['#1e3a5f', '#152238', '#0b1220'] as const,
  inputBorder: '#334155',
  shadow: palette.black,
  navActiveBg: 'rgba(59, 130, 246, 0.25)',
  navActiveText: '#93c5fd',
  navText: palette.slate['400'],
  accentSoft: 'rgba(59, 130, 246, 0.2)',
  chipActiveBg: 'rgba(59, 130, 246, 0.2)',
  chipActiveBorder: '#3b82f6',
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
  goldMuted: 'rgba(212, 160, 23, 0.22)',
  textOnDark: palette.white,
  textMuted: palette.slate['300'],
  textSoft: palette.slate['400'],
  splashGradient: [palette.navy['900'], palette.navy['600'], palette.navy['700'], palette.navy['800']] as const,
} as const;

export function goldMutedAlpha(alpha = 0.22): string {
  return `rgba(212, 160, 23, ${alpha})`;
}
