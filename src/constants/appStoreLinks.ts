/** Android package from app.json — used to build the default Play Store URL. */
export const ANDROID_APP_PACKAGE = 'com.devtechturn.societyassets';

const DEFAULT_ANDROID_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_APP_PACKAGE}`;

/**
 * Replace with your live App Store URL once the app is published
 * (e.g. https://apps.apple.com/app/society-assets/id1234567890).
 * Until then, update EXPO_PUBLIC_IOS_STORE_URL in .env.
 */
const DEFAULT_IOS_STORE_URL = 'https://apps.apple.com/search?term=Society+Assets';

export const ANDROID_STORE_URL =
  process.env.EXPO_PUBLIC_ANDROID_STORE_URL?.trim() || DEFAULT_ANDROID_STORE_URL;

export const IOS_STORE_URL =
  process.env.EXPO_PUBLIC_IOS_STORE_URL?.trim() || DEFAULT_IOS_STORE_URL;

/** Optional YouTube guide shown when sharing society join code (set in .env). */
export const JOIN_GUIDE_VIDEO_URL = process.env.EXPO_PUBLIC_JOIN_GUIDE_VIDEO_URL?.trim() || '';

export function joinGuideVideoLine(): string {
  if (JOIN_GUIDE_VIDEO_URL) {
    return JOIN_GUIDE_VIDEO_URL;
  }
  return '[Add your YouTube video link here]';
}
