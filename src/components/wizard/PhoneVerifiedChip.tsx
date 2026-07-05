import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { wizardStyles as styles } from './wizardStyles';

type Props = {
  phone: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export function PhoneVerifiedChip({ phone, label = 'Verified', style }: Props) {
  return (
    <View style={[styles.phoneChip, style]}>
      <Text style={styles.phoneChipLabel}>{label}</Text>
      <Text style={styles.phoneChipValue}>+91 {phone}</Text>
    </View>
  );
}
