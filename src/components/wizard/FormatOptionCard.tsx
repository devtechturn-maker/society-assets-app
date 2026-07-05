import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { WIZARD_ACCENT } from './wizardStyles';

type Props = {
  label: string;
  description: string;
  example: string;
  selected: boolean;
  onPress: () => void;
};

/** Compact selectable numbering style (full list is shown separately). */
export function FormatOptionCard({ label, description, example, selected, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.body}>
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.example}>{example}</Text>
      </View>
      {selected ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Selected</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  cardSelected: {
    borderColor: WIZARD_ACCENT,
    backgroundColor: '#faf5ff',
  },
  cardPressed: { opacity: 0.94 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
    backgroundColor: '#fff',
  },
  radioSelected: { borderColor: WIZARD_ACCENT },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: WIZARD_ACCENT,
  },
  body: { flex: 1, minWidth: 0, paddingRight: 8 },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy900,
    marginBottom: 2,
  },
  labelSelected: { color: WIZARD_ACCENT },
  description: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
  example: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy800,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: WIZARD_ACCENT,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
  },
});
