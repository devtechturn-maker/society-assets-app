import { StyleSheet, Text, View } from 'react-native';
import { APP_NAME, APP_PRODUCT_NAME, APP_TAGLINE } from '../constants/branding';
import { useTheme } from '../theme/ThemeContext';
import { AppLogo } from './AppLogo';

type Props = {
  compact?: boolean;
};

export function AppBrandFooter({ compact = false }: Props) {
  const { theme } = useTheme();

  return (
    <View style={[styles.wrap, compact ? styles.wrapCompact : null]}>
      <AppLogo variant="glyph" size={compact ? 22 : 28} framed />
      <Text style={[styles.name, { color: theme.text }]}>{APP_NAME}</Text>
      {!compact ? (
        <>
          <Text style={[styles.product, { color: theme.accentGold }]}>{APP_PRODUCT_NAME}</Text>
          <Text style={[styles.tagline, { color: theme.textMuted }]}>{APP_TAGLINE}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  wrapCompact: {
    paddingVertical: 12,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  product: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 24,
  },
});
