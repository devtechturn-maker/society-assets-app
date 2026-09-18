import { Text, TextInput, type TextInputProps, View } from 'react-native';
import { colors } from '../../theme/colors';
import { wizardStyles as styles } from './wizardStyles';

type Props = TextInputProps & {
  label?: string;
  spaced?: boolean;
  hint?: string;
};

export function WizardTextField({ label, spaced, hint, style, ...inputProps }: Props) {
  return (
    <View>
      {label ? (
        <Text style={[styles.fieldLabel, spaced && styles.fieldSpaced]}>{label}</Text>
      ) : null}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.muted}
        {...inputProps}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}
