import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { brandLogos } from '../../constants/branding';
import { SPLASH_COLORS } from './splashTheme';

/** Reference video 720×1280 — bottom decoration height. */
const REF_HEIGHT = 1280;
const BOTTOM_ART_HEIGHT = 400;

/**
 * Uniform lavender screen + top wisps + bottom skyline/waves.
 * No full-screen raster (avoids double-logo and centre colour bands).
 */
export function SplashBackgroundArt() {
  const { width, height } = useWindowDimensions();
  const bottomHeight = height * (BOTTOM_ART_HEIGHT / REF_HEIGHT);
  const wispHeight = height * 0.11;

  return (
    <View style={styles.root} pointerEvents="none">
      <Svg width={width} height={wispHeight} style={styles.topWisps}>
        {[0.04, 0.08, 0.12, 0.16, 0.2].map((t, i) => (
          <Path
            key={`tl-${t}`}
            d={`M 0 0 Q ${width * (0.16 + i * 0.045)} ${wispHeight * (0.15 + t)} ${width * (0.38 + i * 0.035)} ${wispHeight * (0.45 + t * 0.5)}`}
            stroke={SPLASH_COLORS.brandPurple}
            strokeWidth={0.8}
            fill="none"
            opacity={0.08 + i * 0.016}
          />
        ))}
      </Svg>

      <Image
        source={brandLogos.splashBottomArt}
        style={[styles.bottomArt, { width, height: bottomHeight }]}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_COLORS.background,
  },
  topWisps: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  bottomArt: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
});
