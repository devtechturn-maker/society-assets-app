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

export type AppLogoLoaderSize = 'sm' | 'md' | 'lg' | 'xl';

type Props = {
  size?: AppLogoLoaderSize;
  /** Glyph works best for buttons; primary for full-screen boot. */
  logo?: 'glyph' | 'primary';
  /** Pulse only — fits inside buttons without outer rings. */
  minimal?: boolean;
  label?: string;
  /** Label text color context. */
  tone?: 'onDark' | 'onLight';
  style?: StyleProp<ViewStyle>;
};

const WIZARD_ACCENT = '#70088c';
const GOLD_ACCENT = '#fbbf24';

const SIZE_CONFIG: Record<
  AppLogoLoaderSize,
  { glyph: number; primary: number; outer: number; inner: number; stroke: number }
> = {
  sm: { glyph: 22, primary: 72, outer: 44, inner: 34, stroke: 2 },
  md: { glyph: 40, primary: 120, outer: 84, inner: 64, stroke: 2.5 },
  lg: { glyph: 56, primary: 160, outer: 112, inner: 88, stroke: 3 },
  xl: { glyph: 72, primary: 200, outer: 144, inner: 112, stroke: 3.5 },
};

export function AppLogoLoader({
  size = 'md',
  logo = 'glyph',
  minimal = false,
  label,
  tone = 'onDark',
  style,
}: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const spinOuter = useRef(new Animated.Value(0)).current;
  const spinInner = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    breathe.start();

    if (minimal) {
      return () => breathe.stop();
    }

    const outerSpin = Animated.loop(
      Animated.timing(spinOuter, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const innerSpin = Animated.loop(
      Animated.timing(spinInner, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    outerSpin.start();
    innerSpin.start();

    return () => {
      breathe.stop();
      outerSpin.stop();
      innerSpin.stop();
    };
  }, [minimal, pulse, spinInner, spinOuter]);

  const config = SIZE_CONFIG[size];
  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  const logoOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });
  const outerRotate = spinOuter.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const innerRotate = spinInner.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1],
  });

  return (
    <View
      style={[styles.wrap, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
    >
      <View
        style={[
          styles.stage,
          {
            width: minimal ? config.glyph + 8 : config.outer,
            height: minimal ? config.glyph + 8 : config.outer,
          },
        ]}
      >
        {!minimal ? (
          <>
            <Animated.View
              style={[
                styles.ring,
                {
                  width: config.outer,
                  height: config.outer,
                  borderRadius: config.outer / 2,
                  borderWidth: config.stroke,
                  opacity: ringOpacity,
                  transform: [{ rotate: outerRotate }],
                },
                styles.ringOuter,
              ]}
            />
            <Animated.View
              style={[
                styles.ring,
                {
                  width: config.inner,
                  height: config.inner,
                  borderRadius: config.inner / 2,
                  borderWidth: config.stroke - 0.5,
                  opacity: ringOpacity,
                  transform: [{ rotate: innerRotate }],
                },
                styles.ringInner,
              ]}
            />
          </>
        ) : null}

        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        >
          {logo === 'primary' ? (
            <AppLogo variant="primary" size={config.primary} />
          ) : (
            <AppLogo variant="glyph" size={config.glyph} framed={!minimal} />
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

/** Full-screen branded boot loader (splash / session check). */
export function AppBootLoader({
  backgroundColor = '#0f2848',
  label,
}: {
  backgroundColor?: string;
  label?: string;
}) {
  return (
    <View style={[styles.boot, { backgroundColor }]}>
      <AppLogoLoader size="xl" logo="primary" label={label} />
    </View>
  );
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
  ring: {
    position: 'absolute',
    borderColor: 'transparent',
  },
  ringOuter: {
    borderTopColor: WIZARD_ACCENT,
    borderRightColor: 'rgba(112, 8, 140, 0.35)',
  },
  ringInner: {
    borderBottomColor: GOLD_ACCENT,
    borderLeftColor: 'rgba(251, 191, 36, 0.35)',
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
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
