import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { formatInr } from '../../utils/format';

export type KpiItem = {
  label: string;
  value: number | string;
  isCurrency?: boolean;
};

export function KpiGrid({ items }: { items: KpiItem[] }) {
  const { theme } = useTheme();
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[styles.kpi, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
        >
          <Text style={[styles.label, { color: theme.textMuted }]}>{item.label}</Text>
          <Text style={[styles.value, { color: theme.text }]}>
            {typeof item.value === 'string'
              ? item.value
              : item.isCurrency === false
                ? String(item.value)
                : formatInr(item.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  kpi: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
  },
});
