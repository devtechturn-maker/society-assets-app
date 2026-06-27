import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_NAME, PRIMARY_LOGO_ASPECT, brandLogos } from '../constants/branding';

export type AppLogoVariant = 'glyph' | 'primary' | 'splash';

type Props = {
  variant?: AppLogoVariant;
  size?: number;
  /** Purple gradient tile — best for glyph on light or gradient headers. */
  framed?: boolean;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

export function AppLogo({
  variant = 'glyph',
  size = 32,
  framed = false,
  style,
  imageStyle,
  accessibilityLabel = APP_NAME,
}: Props) {
  const source = brandLogos[variant];

  if (variant === 'primary') {
    const width = size;
    const height = size * PRIMARY_LOGO_ASPECT;
    return (
      <Image
        source={source}
        style={[{ width, height }, imageStyle]}
        resizeMode="contain"
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  const logo = (
    <Image
      source={source}
      style={[
        variant === 'splash' ? { width: size, height: size } : { width: size, height: size },
        imageStyle,
      ]}
      resizeMode="contain"
      accessibilityLabel={accessibilityLabel}
    />
  );

  if (!framed || variant !== 'glyph') {
    return <View style={style}>{logo}</View>;
  }

  const frameSize = size + 8;
  return (
    <View style={style}>
      <LinearGradient
        colors={['#70088c', '#5c0672']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.frame, { width: frameSize, height: frameSize, borderRadius: frameSize / 4 }]}
      >
        <Image
          source={source}
          style={[{ width: size, height: size }, imageStyle]}
          resizeMode="contain"
          accessibilityLabel={accessibilityLabel}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
