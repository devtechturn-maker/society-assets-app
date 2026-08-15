import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { AppLogo } from '../components/AppLogo';
import { SplashBackgroundArt } from '../components/splash/SplashBackgroundArt';
import { SPLASH_COLORS, splashLogoSize } from '../components/splash/splashTheme';

/** Minimum branded splash time on cold start / full reload. */
export const SPLASH_DURATION_MS = 2500;

const BREATHE_DURATION_MS = 2200;
const BREATHE_SCALE_MIN = 0.97;
const BREATHE_SCALE_MAX = 1.05;

type Props = {
  onFinish: () => void;
  appReady?: boolean;
};

export function SplashScreen({ onFinish, appReady = false }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const logoSize = splashLogoSize(screenWidth);
  const cornerRadius = logoSize / 4;
  const finished = useRef(false);
  const startedAt = useRef(Date.now());
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: BREATHE_DURATION_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: BREATHE_DURATION_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  useEffect(() => {
    if (!appReady) {
      return;
    }
    ExpoSplashScreen.hideAsync().catch(() => undefined);
  }, [appReady]);

  // Hard failsafe: never leave the OS splash / branded splash forever.
  useEffect(() => {
    const failsafe = setTimeout(() => {
      ExpoSplashScreen.hideAsync().catch(() => undefined);
      if (!finished.current) {
        finished.current = true;
        onFinish();
      }
    }, SPLASH_DURATION_MS + 6000);
    return () => clearTimeout(failsafe);
  }, [onFinish]);

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

  const logoScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [BREATHE_SCALE_MIN, BREATHE_SCALE_MAX],
  });

  return (
    <View style={styles.root}>
      <StatusBar style="dark" backgroundColor={SPLASH_COLORS.background} />
      <SplashBackgroundArt />

      <View style={styles.logoStage} pointerEvents="none">
        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <AppLogo
            variant="splashScreen"
            size={logoSize}
            roundedSquare
            cornerRadius={cornerRadius}
            resizeMode="cover"
            style={styles.logoShadow}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SPLASH_COLORS.background,
  },
  logoStage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#70088c',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.24,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});
