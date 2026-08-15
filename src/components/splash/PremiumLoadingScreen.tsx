import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import type { AppLogoVariant } from '../AppLogo';
import { PremiumLoaderIndicator } from './PremiumLoaderIndicator';
import { SplashBackgroundArt } from './SplashBackgroundArt';
import { SPLASH_COLORS } from './splashTheme';

type Props = {
  label?: string;
  logoSize?: number;
  ringSize?: number;
  logoVariant?: AppLogoVariant;
  logoRoundedSquare?: boolean;
};

/** Full-screen premium loading layout — global overlay & session boot. */
export function PremiumLoadingScreen({
  label = 'Loading...',
  logoSize,
  ringSize,
  logoVariant = 'splash',
  logoRoundedSquare = false,
}: Props) {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" backgroundColor={SPLASH_COLORS.background} />
      <SplashBackgroundArt />

      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <PremiumLoaderIndicator
            label={label}
            logoSize={logoSize}
            ringSize={ringSize}
            logoVariant={logoVariant}
            logoRoundedSquare={logoRoundedSquare}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SPLASH_COLORS.background,
  },
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
