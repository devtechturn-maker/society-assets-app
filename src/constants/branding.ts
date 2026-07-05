import { Image } from 'react-native';

/** Central app branding — update logos in /assets and run `npm run sync:icon`. */
export const APP_NAME = 'Society Assets';
export const APP_TAGLINE = 'Building trust. Managing assets.';

export const brandLogos = {
  glyph: require('../../assets/logo-glyph.png'),
  /** Login / marketing wordmark (~130 KB, not the old 2 MB source). */
  primary: require('../../assets/logo.png'),
  /** Matches native splash (`splash-logo.png`, ~78 KB). */
  splash: require('../../assets/splash-logo.png'),
} as const;

const primaryMeta = Image.resolveAssetSource(brandLogos.primary);
const splashMeta = Image.resolveAssetSource(brandLogos.splash);

/** Primary logo is wider than tall (used on login / marketing screens). */
export const PRIMARY_LOGO_ASPECT =
  primaryMeta.width > 0 ? primaryMeta.height / primaryMeta.width : 1536 / 1024;

export const SPLASH_LOGO_ASPECT =
  splashMeta.width > 0 ? splashMeta.height / splashMeta.width : 1;
