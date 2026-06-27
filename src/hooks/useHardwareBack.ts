import { useEffect } from 'react';
import { registerHardwareBackHandler } from '../services/hardwareBackNavigation';

/** Register a handler while `enabled` (e.g. on a detail/create sub-screen). Return true to consume the back press. */
export function useHardwareBack(handler: () => boolean, enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    return registerHardwareBackHandler(handler);
  }, [enabled, handler]);
}
