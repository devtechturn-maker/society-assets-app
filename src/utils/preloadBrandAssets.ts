import { Asset } from 'expo-asset';
import { brandLogos } from '../constants/branding';

let preloadPromise: Promise<void> | null = null;

/** Load bundled logo PNGs into memory before splash/login render. */
export function preloadBrandAssets(): Promise<void> {
  if (preloadPromise) {
    return preloadPromise;
  }

  preloadPromise = Asset.loadAsync(Object.values(brandLogos)).then(() => undefined);

  return preloadPromise;
}
