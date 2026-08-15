import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SPLASH_COLORS } from './splashTheme';

type Props = {
  size: number;
};

function ringCircumference(radius: number): number {
  return 2 * Math.PI * radius;
}

function RotatingLayer({
  size,
  duration,
  reverse,
  children,
  offsetDeg = -90,
}: {
  size: number;
  duration: number;
  reverse?: boolean;
  children: ReactNode;
  offsetDeg?: number;
}) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [duration, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: reverse
      ? [`${offsetDeg + 360}deg`, `${offsetDeg}deg`]
      : [`${offsetDeg}deg`, `${offsetDeg + 360}deg`],
  });

  return (
    <Animated.View style={[styles.layer, { width: size, height: size, transform: [{ rotate }] }]}>
      {children}
    </Animated.View>
  );
}

function TrackRing({
  size,
  radius,
  stroke,
  strokeWidth,
  opacity = 1,
  dasharray,
}: {
  size: number;
  radius: number;
  stroke: string;
  strokeWidth: number;
  opacity?: number;
  dasharray?: string;
}) {
  const center = size / 2;
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dasharray}
        strokeLinecap="round"
        fill="none"
        opacity={opacity}
      />
    </Svg>
  );
}

/** Four dots clustered on the upper-left arc, like the reference screenshot. */
function ArcDots({ size, radius }: { size: number; radius: number }) {
  const center = size / 2;
  const angles = [208, 222, 236, 250];

  return (
    <Svg width={size} height={size}>
      {angles.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <Circle
            key={deg}
            cx={center + radius * Math.cos(rad)}
            cy={center + radius * Math.sin(rad)}
            r={2.6}
            fill={SPLASH_COLORS.brandPurple}
            opacity={0.7}
          />
        );
      })}
    </Svg>
  );
}

export function SplashLoadingRings({ size }: Props) {
  const outerR = size / 2 - 8;
  const midR = size / 2 - 20;
  const innerR = size / 2 - 34;
  const outerC = ringCircumference(outerR);
  const midC = ringCircumference(midR);
  const innerC = ringCircumference(innerR);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {/* Static faint tracks */}
      <TrackRing
        size={size}
        radius={outerR}
        stroke={SPLASH_COLORS.lavenderLight}
        strokeWidth={1}
        opacity={0.35}
      />
      <TrackRing
        size={size}
        radius={midR}
        stroke={SPLASH_COLORS.lavenderLight}
        strokeWidth={1}
        opacity={0.22}
        dasharray={`${midC * 0.06} ${midC * 0.1}`}
      />

      {/* Outermost thin lavender dashes — slow */}
      <RotatingLayer size={size} duration={6400} reverse>
        <TrackRing
          size={size}
          radius={outerR}
          stroke={SPLASH_COLORS.lavenderMid}
          strokeWidth={1.4}
          dasharray={`${outerC * 0.09} ${outerC * 0.14}`}
        />
      </RotatingLayer>

      {/* Dots on outer arc — rotate with outer ring */}
      <RotatingLayer size={size} duration={6400} reverse>
        <ArcDots size={size} radius={outerR - 1} />
      </RotatingLayer>

      {/* Middle thin purple segments */}
      <RotatingLayer size={size} duration={4200}>
        <TrackRing
          size={size}
          radius={midR}
          stroke={SPLASH_COLORS.brandPurple}
          strokeWidth={1.3}
          opacity={0.45}
          dasharray={`${midC * 0.11} ${midC * 0.2}`}
        />
      </RotatingLayer>

      {/* Inner thick purple arc — main spinner (~58% of circle) */}
      <RotatingLayer size={size} duration={2200}>
        <TrackRing
          size={size}
          radius={innerR}
          stroke={SPLASH_COLORS.brandPurple}
          strokeWidth={4.5}
          dasharray={`${innerC * 0.58} ${innerC * 0.42}`}
        />
      </RotatingLayer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
