import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle, type ImageResizeMode } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_NAME, PRIMARY_LOGO_ASPECT, brandLogos } from '../constants/branding';

export type AppLogoVariant = 'glyph' | 'primary' | 'splash' | 'splashScreen';

type Props = {
  variant?: AppLogoVariant;
  size?: number;
  /** Purple gradient tile — best for glyph on light or gradient headers. */
  framed?: boolean;
  /** Square clip with rounded corners (matches app logo tile). */
  roundedSquare?: boolean;
  /** Corner radius for roundedSquare; defaults to size / 4. */
  cornerRadius?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
  resizeMode?: ImageResizeMode;
};

const defaultImageProps = {
  fadeDuration: 0,
};

export function AppLogo({
  variant = 'glyph',
  size = 32,
  framed = false,
  roundedSquare = false,
  cornerRadius,
  style,
  imageStyle,
  accessibilityLabel = APP_NAME,
  resizeMode = 'contain',
}: Props) {
  const source = brandLogos[variant];
  const imageProps = { ...defaultImageProps, resizeMode };

  if (variant === 'splash' || variant === 'splashScreen' || (variant === 'primary' && roundedSquare)) {
    const radius = cornerRadius ?? size / 4;
    return (
      <View
        style={[
          { width: size, height: size, borderRadius: radius, overflow: 'hidden' },
          style,
        ]}
      >
        <Image
          source={source}
          style={[{ width: size, height: size }, imageStyle]}
          accessibilityLabel={accessibilityLabel}
          {...imageProps}
        />
      </View>
    );
  }

  if (variant === 'primary') {
    const aspect = PRIMARY_LOGO_ASPECT;
    const width = size;
    const height = size * aspect;
    return (
      <View style={style}>
        <Image
          source={source}
          style={[{ width, height }, imageStyle]}
          accessibilityLabel={accessibilityLabel}
          {...imageProps}
        />
      </View>
    );
  }

  const logo = (
    <Image
      source={source}
      style={[{ width: size, height: size }, imageStyle]}
      accessibilityLabel={accessibilityLabel}
      {...imageProps}
    />
  );

  if (!framed) {
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
        {logo}
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
