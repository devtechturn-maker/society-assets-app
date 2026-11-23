import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { MonthTotals } from '../../types/api';
import { formatInr } from '../../utils/format';

type Props = {
  thisMonth: MonthTotals;
  lastMonth: MonthTotals;
};

const ROWS = [
  ['Income', 'income'],
  ['Expenses', 'expenses'],
  ['Net', 'net'],
] as const;

export function MonthComparison({ thisMonth, lastMonth }: Props) {
  const { theme } = useTheme();
  return (
    <View style={styles.table}>
      <View style={styles.row}>
        <Text style={styles.label} />
        <Text style={[styles.head, { color: theme.textMuted }]}>This month</Text>
        <Text style={[styles.head, { color: theme.textMuted }]}>Last month</Text>
      </View>
      {ROWS.map(([label, key]) => (
        <View key={key} style={styles.row} accessible>
          <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
          {[thisMonth, lastMonth].map((totals, index) => (
            <Text
              key={index}
              style={[styles.value, { color: theme.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {formatInr(totals[key])}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 0.8, fontSize: 13, fontWeight: '600' },
  head: { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  value: { flex: 1, fontSize: 15, fontWeight: '800', textAlign: 'right' },
});
