import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getAllowScreenCapture, setAllowScreenCapture as persistAllow } from '../services/preferences';

type ScreenCaptureContextValue = {
  /** When true, the user may take screenshots and screen recordings. When false, capture is blocked. */
  allowScreenCapture: boolean;
  ready: boolean;
  setAllowScreenCapture: (allow: boolean) => void;
};

const ScreenCaptureContext = createContext<ScreenCaptureContextValue | null>(null);

export function ScreenCaptureProvider({ children }: { children: React.ReactNode }) {
  const [allowScreenCapture, setAllowState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getAllowScreenCapture().then((allow) => {
      setAllowState(allow);
      setReady(true);
    });
  }, []);

  const setAllowScreenCapture = useCallback((allow: boolean) => {
    setAllowState(allow);
    persistAllow(allow).catch(() => undefined);
  }, []);

  const value = useMemo<ScreenCaptureContextValue>(
    () => ({ allowScreenCapture, ready, setAllowScreenCapture }),
    [allowScreenCapture, ready, setAllowScreenCapture]
  );

  return <ScreenCaptureContext.Provider value={value}>{children}</ScreenCaptureContext.Provider>;
}

export function useScreenCaptureSettings(): ScreenCaptureContextValue {
  const ctx = useContext(ScreenCaptureContext);
  if (!ctx) {
    throw new Error('useScreenCaptureSettings must be used within ScreenCaptureProvider');
  }
  return ctx;
}
