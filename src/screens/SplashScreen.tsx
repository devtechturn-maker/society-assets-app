import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useTheme } from '../theme/ThemeContext';

/** Always show at least this long on every cold start / full reload. */
export const SPLASH_DURATION_MS = 2500;

const LOGO_SIZE = 88;

type Props = {
  onFinish: () => void;
};

/** Minimal splash: solid theme color + centered logo (Twitter / Facebook style). */
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
          <View style={styles.logoPlate}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Society Assets"
            />
          </View>
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
  logoPlate: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  logoImage: {
    width: LOGO_SIZE - 8,
    height: LOGO_SIZE - 8,
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
