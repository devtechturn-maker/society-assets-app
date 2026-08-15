import { palette } from '../../theme/colors';

/** Premium loading palette — brand purple + lavender tints only. */
export const SPLASH_COLORS = {
  /** Sampled from bottom splash art sky (reference video). */
  background: '#f8edf7',
  backgroundMid: '#f8edf7',
  backgroundSoft: palette.info.bg,
  brandPurple: palette.navy['700'],
  brandPurpleDark: palette.navy['800'],
  brandPurpleDeep: palette.navy['900'],
  lavenderLight: 'rgba(112, 8, 140, 0.14)',
  lavenderMid: 'rgba(112, 8, 140, 0.28)',
  lavenderSoft: 'rgba(112, 8, 140, 0.08)',
  /** Deeper band at the very bottom of the splash waves. */
  lavenderWaveDeep: 'rgba(112, 8, 140, 0.22)',
  lavenderWavePale: 'rgba(112, 8, 140, 0.06)',
  text: palette.info.text,
  textMuted: '#6b5f7a',
} as const;

export function premiumLoaderSizes(screenWidth: number, screenHeight: number) {
  const ringSize = Math.min(screenWidth * 0.62, screenHeight * 0.34, 252);
  const logoSize = Math.min(screenWidth * 0.26, ringSize * 0.46, 104);
  return { ringSize, logoSize };
}

/** Compact centred loader for the global API overlay. */
export function globalLoaderSizes(screenWidth: number) {
  const ringSize = Math.min(screenWidth * 0.3, 104);
  const logoSize = Math.min(ringSize * 0.36, 40);
  return { ringSize, logoSize };
}

/** Centred logo on splash — compact tile, matches reference video scale. */
export function splashLogoSize(screenWidth: number): number {
  return Math.min(screenWidth * 0.17, 76);
}

/** Logo inside global loader rings (smaller than splash). */
export function splashAppLogoSize(screenWidth: number, ringSize: number): number {
  return Math.min(screenWidth * 0.22, ringSize * 0.36, 76);
}
