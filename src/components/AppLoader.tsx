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
import Svg, { Circle } from 'react-native-svg';

/** Admin Panel primary — keep loader brand-aligned. */
export const APP_LOADER_COLOR = '#0F172A';

type AppLoaderSize = 'sm' | 'md' | 'lg';

type Props = {
  /** Optional caption under the spinner. */
  label?: string;
  size?: AppLoaderSize;
  /** When true, use light text for dark backgrounds. */
  onDark?: boolean;
  style?: StyleProp<ViewStyle>;
};

const SIZE_PX: Record<AppLoaderSize, number> = {
  sm: 22,
  md: 36,
  lg: 48,
};

/**
 * Single consistent app loader — one ring, brand color, no stacked indicators.
 */
export function AppLoader({
  label,
  size = 'md',
  onDark = false,
  style,
}: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const dimension = SIZE_PX[size];
  const stroke = Math.max(2.5, dimension * 0.1);
  const radius = (dimension - stroke) / 2;
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
    <View
      style={[styles.wrap, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
    >
      <Animated.View style={{ width: dimension, height: dimension, transform: [{ rotate }] }}>
        <Svg width={dimension} height={dimension}>
          <Circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            stroke={onDark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.12)'}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            stroke={onDark ? '#FFFFFF' : APP_LOADER_COLOR}
            strokeWidth={stroke}
            strokeDasharray={`${circumference * 0.28} ${circumference * 0.72}`}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
      {label ? (
        <Text style={[styles.label, onDark ? styles.labelOnDark : styles.labelOnLight]}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelOnLight: {
    color: '#475569',
  },
  labelOnDark: {
    color: 'rgba(255,255,255,0.88)',
  },
});
