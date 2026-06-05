import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useTheme } from '../theme/ThemeContext';

/** Always show at least this long on every cold start / full reload. */
export const SPLASH_DURATION_MS = 2500;

const LOGO_WIDTH = 300;
const LOGO_HEIGHT = 340;

const splashLogo = require('../../assets/logo.png');

type Props = {
  onFinish: () => void;
};

/** Branded splash: theme background + centered app logo. */
export function SplashScreen({ onFinish }: Props) {
  const { theme } = useTheme();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const finished = useRef(false);

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => undefined);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 9,
          tension: 65,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoOpacity, logoScale, footerOpacity]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (finished.current) {
        return;
      }
      finished.current = true;
      onFinish();
    }, SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={[styles.root, { backgroundColor: theme.splashBg }]}>
      <StatusBar style="light" backgroundColor={theme.splashBg} />

      <View style={styles.center}>
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        >
          <Image
            source={splashLogo}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Society Assets"
          />
        </Animated.View>
      </View>

      <Animated.Text style={[styles.footerBrand, { opacity: footerOpacity }]}>
        SOCIETY ASSETS
      </Animated.Text>
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
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
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
