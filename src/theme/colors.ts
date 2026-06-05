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
  navActiveBg: 'rgba(112, 8, 140, 0.18)',
  navActiveText: palette.navy['700'],
  navText: palette.slate['300'],
  accentSoft: 'rgba(112, 8, 140, 0.14)',
  chipActiveBg: 'rgba(112, 8, 140, 0.12)',
  chipActiveBorder: palette.navy['700'],
} as const;

export const dark = {
  pageBg: tokens.dark.pageBg,
  surface: tokens.dark.surface,
  splashBg: tokens.dark.splashBg,
  cardBg: '#26102f',
  cardBorder: '#3d1a4d',
  text: palette.slate['100'],
  textMuted: palette.slate['400'],
  textSoft: palette.slate['300'],
  textOnDark: palette.slate['100'],
  textOnDarkMuted: palette.slate['400'],
  textOnDarkSoft: palette.slate['300'],
  accent: palette.gold['500'],
  accentGold: palette.gold['400'],
  headerGradient: [palette.navy['700'], palette.navy['800'], palette.navy['900']] as const,
  inputBorder: '#334155',
  shadow: palette.black,
  navActiveBg: 'rgba(160, 75, 189, 0.22)',
  navActiveText: palette.gold['400'],
  navText: palette.slate['400'],
  accentSoft: 'rgba(112, 8, 140, 0.2)',
  chipActiveBg: 'rgba(112, 8, 140, 0.2)',
  chipActiveBorder: palette.navy['700'],
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
  splashGradient: [palette.navy['900'], palette.navy['600'], palette.navy['700'], palette.navy['800']] as const,
} as const;

export function goldMutedAlpha(alpha = 0.22): string {
  return `rgba(112, 8, 140, ${alpha})`;
}
