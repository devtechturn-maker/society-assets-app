/**
 * Point this at your Spring Boot API.
 * - Android emulator: http://10.0.2.2:8080 (maps to host machine localhost)
 * - Physical phone: http://YOUR_PC_LAN_IP:8080 (same Wi‑Fi as PC)
 *
 * Resolution order: EXPO_PUBLIC_API_URL (.env) → app.json expo.extra.apiBaseUrl → emulator default.
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

/** Local branch — Android emulator → host machine (Spring on localhost:8080). */
const FALLBACK = 'http://10.0.2.2:8080';

export const API_BASE_URL = resolved ?? FALLBACK;

const webResolved = firstNonEmpty(
  process.env.EXPO_PUBLIC_WEB_URL,
  (Constants.expoConfig?.extra as { webPortalUrl?: string } | undefined)?.webPortalUrl
);

/** Public website for subscription plans (use PC LAN IP on physical device). */
export const WEB_PORTAL_URL = webResolved ?? 'http://localhost:4200';

if (__DEV__) {
  console.log('[SocietyAssets] API_BASE_URL =', API_BASE_URL);
  console.log('[SocietyAssets] WEB_PORTAL_URL =', WEB_PORTAL_URL);
}
