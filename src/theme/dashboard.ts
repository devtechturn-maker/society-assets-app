import { colors } from './colors';

export const dashboard = {
  pageBg: '#eef2f7',
  sidebarBg: colors.navy800,
  sidebarGradient: [colors.navy800, colors.navy900] as const,
  activeNavBg: 'rgba(16, 185, 129, 0.2)',
  activeNavText: '#a7f3d0',
  navText: '#cbd5e1',
  subtitle: '#94a3b8',
  logout: '#ef4444',
  cardBg: colors.white,
  cardBorder: colors.borderLight,
  kpiLabel: colors.muted,
  heading: colors.heading,
} as const;
