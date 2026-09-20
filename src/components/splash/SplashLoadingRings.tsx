import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { APP_LOADER_COLOR } from '../AppLoader';
import { SPLASH_COLORS } from './splashTheme';

type Props = {
  size: number;
};

/**
 * Single rotating brand ring — kept for splash-era imports.
 * Prefer AppLoader for new UI.
 */
export function SplashLoadingRings({ size }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const stroke = Math.max(3, size * 0.06);
  const radius = size / 2 - stroke;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '270deg'],
  });

  return (
    <Animated.View style={[styles.wrap, { width: size, height: size, transform: [{ rotate }] }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={SPLASH_COLORS.lavenderLight}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={APP_LOADER_COLOR}
          strokeWidth={stroke}
          strokeDasharray={`${circumference * 0.28} ${circumference * 0.72}`}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
