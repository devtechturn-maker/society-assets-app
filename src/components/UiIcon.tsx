import { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ICONS8_SLUGS, type UiIconName } from '../constants/uiIcons';

type Props = {
  name: UiIconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/** Monochrome outline icons (Icons8 ios-glyphs style). Requires network on first load. */
export function UiIcon({ name, size = 28, color = '#475569', style }: Props) {
  const [failed, setFailed] = useState(false);
  const slug = ICONS8_SLUGS[name];
  const uri = useMemo(
    () => `https://img.icons8.com/ios-glyphs/${Math.round(size * 2)}/${slug}.png`,
    [size, slug]
  );

  if (failed) {
    return (
      <View style={[styles.fallback, { width: size, height: size }, style]}>
        <Text style={[styles.fallbackText, { fontSize: size * 0.55, color }]}>•</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.icon, { width: size, height: size, tintColor: color }, style]}
      resizeMode="contain"
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  icon: {},
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontWeight: '700',
  },
});
