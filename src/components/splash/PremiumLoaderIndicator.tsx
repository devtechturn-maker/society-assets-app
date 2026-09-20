import { StyleSheet, Text, View } from 'react-native';
import { AppLoader } from '../AppLoader';

type Props = {
  label?: string;
  /** @deprecated Ignored — single unified loader size. */
  logoSize?: number;
  /** @deprecated Ignored — single unified loader size. */
  ringSize?: number;
  /** @deprecated Ignored. */
  logoVariant?: string;
  /** @deprecated Ignored. */
  logoRoundedSquare?: boolean;
  compact?: boolean;
};

/**
 * Unified branded loader used by boot / splash layouts.
 * One ring only — replaces the previous multi-ring indicator that looked like stacked loaders.
 */
export function PremiumLoaderIndicator({
  label = 'Loading...',
  compact = false,
}: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={label}>
      <AppLoader size={compact ? 'md' : 'lg'} label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
