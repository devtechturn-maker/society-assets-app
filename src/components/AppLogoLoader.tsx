import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AppLogo } from './AppLogo';
import { APP_TAGLINE } from '../constants/branding';
import { PremiumLoadingScreen } from './splash/PremiumLoadingScreen';

export type AppLogoLoaderSize = 'sm' | 'md' | 'lg' | 'xl';

type Props = {
  size?: AppLogoLoaderSize;
  /** Glyph for tiny buttons; splash = purple fill; primary = full wordmark. */
  logo?: 'glyph' | 'primary' | 'splash';
  /** Smaller pulse — fits inside buttons. */
  minimal?: boolean;
  label?: string;
  /** Label text color context. */
  tone?: 'onDark' | 'onLight';
  style?: StyleProp<ViewStyle>;
  /** Override rendered logo size in pixels (splash / glyph / primary). */
  logoPixelSize?: number;
};

const SIZE_CONFIG: Record<
  AppLogoLoaderSize,
  { glyph: number; splash: number; primary: number }
> = {
  sm: { glyph: 22, splash: 28, primary: 72 },
  md: { glyph: 40, splash: 52, primary: 120 },
  lg: { glyph: 56, splash: 72, primary: 160 },
  xl: { glyph: 72, splash: 96, primary: 200 },
};

function logoPixelSize(
  config: (typeof SIZE_CONFIG)[AppLogoLoaderSize],
  logo: NonNullable<Props['logo']>
): number {
  if (logo === 'primary') return config.primary;
  if (logo === 'glyph') return config.glyph;
  return config.splash;
}

export function AppLogoLoader({
  size = 'md',
  logo = 'splash',
  minimal = false,
  label,
  tone = 'onDark',
  style,
  logoPixelSize: logoPixelSizeOverride,
}: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: minimal ? 700 : 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: minimal ? 700 : 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    breathe.start();
    return () => breathe.stop();
  }, [minimal, pulse]);

  const config = SIZE_CONFIG[size];
  const renderedLogoSize = logoPixelSizeOverride ?? logoPixelSize(config, logo);
  const stageSize = renderedLogoSize + (minimal ? 8 : 16);

  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: minimal ? [0.94, 1] : [0.9, 1.06],
  });
  const logoOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: minimal ? [0.82, 1] : [0.78, 1],
  });
  const logoFloat = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: minimal ? [0, 0] : [0, -8],
  });

  return (
    <View
      style={[styles.wrap, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
    >
      <View style={[styles.stage, { width: stageSize, height: stageSize }]}>
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }, { translateY: logoFloat }],
          }}
        >
          {logo === 'primary' ? (
            <AppLogo variant="primary" size={renderedLogoSize} />
          ) : logo === 'glyph' ? (
            <AppLogo variant="glyph" size={renderedLogoSize} />
          ) : (
            <AppLogo variant="splash" size={renderedLogoSize} resizeMode="cover" />
          )}
        </Animated.View>
      </View>

      {label ? (
        <Text style={[styles.label, tone === 'onLight' ? styles.labelOnLight : styles.labelOnDark]}>
          {label}
        </Text>
      ) : null}
      {!label && size === 'xl' && logo === 'primary' ? (
        <Text style={styles.tagline}>{APP_TAGLINE}</Text>
      ) : null}
    </View>
  );
}

/** Full-screen branded boot loader (session check after splash). */
export function AppBootLoader({ label = 'Loading...' }: { backgroundColor?: string; label?: string }) {
  return <PremiumLoadingScreen label={label} />;
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 18,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  labelOnDark: {
    color: 'rgba(255, 255, 255, 0.88)',
  },
  labelOnLight: {
    color: '#475569',
  },
  tagline: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
