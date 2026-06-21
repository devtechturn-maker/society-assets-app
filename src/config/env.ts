/**
 * Local branch only — do not change on development (protected by .gitattributes).
 * Resolution order: EXPO_PUBLIC_API_URL (.env) → app.json extra → fallback below.
 *
 * - PC / iOS Simulator: http://localhost:8080
 * - Android emulator:   http://10.0.2.2:8080  (set in .env)
 * - Physical phone:     http://192.168.1.37:8080 (set in .env)
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

/** Local Spring Boot on this PC. */
const FALLBACK = 'http://localhost:8080';

export const API_BASE_URL = resolved ?? FALLBACK;

const webResolved = firstNonEmpty(
  process.env.EXPO_PUBLIC_WEB_URL,
  (Constants.expoConfig?.extra as { webPortalUrl?: string } | undefined)?.webPortalUrl
);

export const WEB_PORTAL_URL = webResolved ?? 'http://localhost:4200';

if (__DEV__) {
  console.log('[SocietyAssets] API_BASE_URL =', API_BASE_URL);
  console.log('[SocietyAssets] WEB_PORTAL_URL =', WEB_PORTAL_URL);
}
