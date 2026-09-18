import { colors } from './colors';

export const dashboard = {
  pageBg: colors.pageBg,
  sidebarBg: colors.navy800,
  sidebarGradient: [colors.navy800, colors.navy900] as const,
  activeNavBg: 'rgba(15, 23, 42, 0.12)',
  activeNavText: colors.gold400,
  navText: '#cbd5e1',
  subtitle: '#94a3b8',
  logout: '#ef4444',
  cardBg: colors.white,
  cardBorder: colors.borderLight,
  kpiLabel: colors.muted,
  heading: colors.heading,
} as const;
