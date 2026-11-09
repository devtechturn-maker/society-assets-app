import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * Blocks screenshots and screen recording while any society document or photo is on screen.
 * Many components can ask at once (every photo in a chat list), so requests are counted and
 * capture is allowed again only when the last one goes away.
 */
const KEY = 'society-documents';
let holders = 0;

function update(next: number) {
  const was = holders;
  holders = Math.max(0, next);
  if (Platform.OS === 'web') return;
  if (was === 0 && holders > 0) {
    void ScreenCapture.preventScreenCaptureAsync(KEY).catch(() => undefined);
  } else if (was > 0 && holders === 0) {
    void ScreenCapture.allowScreenCaptureAsync(KEY).catch(() => undefined);
  }
}

export function useDocumentScreenProtection(active = true): void {
  useEffect(() => {
    if (!active) return undefined;
    update(holders + 1);
    return () => update(holders - 1);
  }, [active]);
}

/** Test helper. */
export function documentProtectionHolders(): number {
  return holders;
}
