/**
 * Point this at your Spring Boot API.
 * - EAS dev builds / devices: https://society-assets-backend.onrender.com (app.json + eas.json)
 * - Local Spring on PC: set EXPO_PUBLIC_API_URL in .env (e.g. http://10.0.2.2:8080 or LAN IP)
 *
 * Resolution order: EXPO_PUBLIC_API_URL (.env) → app.json expo.extra.apiBaseUrl → Render fallback.
 */
import Constants from 'expo-constants';

function firstNonEmpty(...vals: (string | undefined | null)[]): string | undefined {
  for (const v of vals) {
    if (typeof v !== 'string') continue;
    const t = v.trim().replace(/\/$/, '');
    if (t) return t;
  }
  return undefined;
}

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;

const resolved = firstNonEmpty(process.env.EXPO_PUBLIC_API_URL, extra?.apiBaseUrl);

/** Default when no .env or app.json override — hosted backend on Render. */
const FALLBACK = 'https://society-assets-backend.onrender.com';

export const API_BASE_URL = resolved ?? FALLBACK;

const webResolved = firstNonEmpty(
  process.env.EXPO_PUBLIC_WEB_URL,
  (Constants.expoConfig?.extra as { webPortalUrl?: string } | undefined)?.webPortalUrl
);

/** Public website for subscription plans. */
export const WEB_PORTAL_URL = webResolved ?? 'https://society-assets-frontend.vercel.app';

if (__DEV__) {
  console.log('[SocietyAssets] API_BASE_URL =', API_BASE_URL);
  console.log('[SocietyAssets] WEB_PORTAL_URL =', WEB_PORTAL_URL);
}
