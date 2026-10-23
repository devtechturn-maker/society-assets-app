import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { wizardStyles as styles } from './wizardStyles';

type Props = {
  /** The verified value shown, e.g. the login email. */
  value: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export function VerifiedChip({ value, label = 'Verified', style }: Props) {
  return (
    <View style={[styles.phoneChip, style]}>
      <Text style={styles.phoneChipLabel}>{label}</Text>
      <Text style={styles.phoneChipValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
