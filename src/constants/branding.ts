/** Central app branding — update logos in /assets and run `npm run sync:icon`. */
export const APP_NAME = 'Society Assets';
export const APP_PRODUCT_NAME = 'GrihaLedger';
export const APP_TAGLINE = 'Building trust. Managing assets.';

export const brandLogos = {
  glyph: require('../../assets/logo-glyph.png'),
  primary: require('../../assets/primary-logo.png'),
  splash: require('../../assets/logo.png'),
} as const;

/** Primary logo is wider than tall (used on login / marketing screens). */
export const PRIMARY_LOGO_ASPECT = 1536 / 1024;
