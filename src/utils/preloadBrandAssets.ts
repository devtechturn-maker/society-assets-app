import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';
import { brandLogos } from '../constants/branding';

let preloadPromise: Promise<void> | null = null;

/**
 * Load critical local assets before first paint:
 * - Brand logo PNGs
 * - Ionicons font (used by UiIcon + many screens)
 *
 * Remote Icons8 images are NOT used — they caused 1–2s icon delays.
 */
export function preloadBrandAssets(): Promise<void> {
  if (preloadPromise) {
    return preloadPromise;
  }

  preloadPromise = Promise.all([
    Asset.loadAsync(Object.values(brandLogos)),
    Ionicons.loadFont(),
  ]).then(() => undefined);

  return preloadPromise;
}
