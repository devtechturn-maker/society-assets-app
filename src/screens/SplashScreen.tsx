import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { AppLogo } from '../components/AppLogo';
import { useTheme } from '../theme/ThemeContext';

/** Minimum branded splash time on cold start / full reload. */
export const SPLASH_DURATION_MS = 2500;

type Props = {
  onFinish: () => void;
  /** When true, splash may dismiss after the minimum duration (session + assets ready). */
  appReady?: boolean;
};

/** Branded splash: same image as native splash, shown at full opacity immediately. */
export function SplashScreen({ onFinish, appReady = false }: Props) {
  const { theme } = useTheme();
  const finished = useRef(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!appReady) {
      return;
    }
    ExpoSplashScreen.hideAsync().catch(() => undefined);
  }, [appReady]);

  useEffect(() => {
    if (!appReady || finished.current) {
      return;
    }

    const elapsed = Date.now() - startedAt.current;
    const remaining = Math.max(0, SPLASH_DURATION_MS - elapsed);
    const timer = setTimeout(() => {
      if (finished.current) {
        return;
      }
      finished.current = true;
      onFinish();
    }, remaining);

    return () => clearTimeout(timer);
  }, [appReady, onFinish]);

  return (
    <View style={[styles.root, { backgroundColor: theme.splashBg }]}>
      <StatusBar style="light" backgroundColor={theme.splashBg} />

      <View style={styles.center}>
        <AppLogo variant="splash" size={300} />
      </View>

      <Text style={styles.footerBrand}>SOCIETY ASSETS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBrand: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 4.5,
  },
});
