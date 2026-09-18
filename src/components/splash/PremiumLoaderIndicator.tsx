import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AppLogo, type AppLogoVariant } from '../AppLogo';
import { SplashLoadingRings } from './SplashLoadingRings';
import { premiumLoaderSizes, splashAppLogoSize, SPLASH_COLORS } from './splashTheme';

type Props = {
  label?: string;
  logoSize?: number;
  ringSize?: number;
  logoVariant?: AppLogoVariant;
  logoRoundedSquare?: boolean;
  /** Smaller label spacing — used by the global overlay loader. */
  compact?: boolean;
};

export function PremiumLoaderIndicator({
  label = 'Loading...',
  logoSize: logoSizeProp,
  ringSize: ringSizeProp,
  logoVariant = 'splash',
  logoRoundedSquare = false,
  compact = false,
}: Props) {
  const { width, height } = useWindowDimensions();
  const defaults = premiumLoaderSizes(width, height);
  const ringSize = ringSizeProp ?? defaults.ringSize;
  const logoSize =
    logoSizeProp ??
    (logoRoundedSquare
      ? splashAppLogoSize(width, ringSize)
      : logoVariant === 'primary'
        ? Math.min(width * 0.42, ringSize * 0.72, 148)
        : defaults.logoSize);
  const cornerRadius = logoSize / 4;

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={[styles.loaderStack, { width: ringSize, height: ringSize }]}>
        <SplashLoadingRings size={ringSize} />
        <View style={styles.logoSlot}>
          <AppLogo
            variant={logoVariant}
            size={logoSize}
            roundedSquare={logoRoundedSquare || logoVariant === 'splash'}
            cornerRadius={cornerRadius}
            resizeMode="cover"
          />
        </View>
      </View>

      {label ? (
        <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSlot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 22,
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.15,
    color: SPLASH_COLORS.textMuted,
    textAlign: 'center',
  },
  labelCompact: {
    marginTop: 12,
    fontSize: 13,
  },
});
