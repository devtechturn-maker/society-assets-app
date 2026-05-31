import { useEffect } from 'react';
import { Platform } from 'react-native';
import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture';
import { useScreenCaptureSettings } from '../context/ScreenCaptureContext';

/**
 * Applies OS screenshot / screen-recording policy from user preference.
 * Blocked when "Allow screenshots" is off; permitted when it is on.
 */
export function SecureScreenGuard() {
  const { allowScreenCapture, ready } = useScreenCaptureSettings();

  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;

    (async () => {
      try {
        if (allowScreenCapture) {
          await allowScreenCaptureAsync();
        } else {
          await preventScreenCaptureAsync();
        }
      } catch {
        // Unsupported runtime (e.g. older iOS) — ignore
      }
    })();

    return () => {
      allowScreenCaptureAsync().catch(() => undefined);
    };
  }, [allowScreenCapture, ready]);

  return null;
}
