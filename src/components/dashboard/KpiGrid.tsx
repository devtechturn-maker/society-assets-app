import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { formatInr } from '../../utils/format';

export type KpiItem = {
  label: string;
  value: number | string;
  isCurrency?: boolean;
  highlight?: boolean;
};

type Props = {
  items: KpiItem[];
  columns?: 2 | 3;
};

function formatValue(item: KpiItem): string {
  if (typeof item.value === 'string') {
    return item.value;
  }
  if (item.isCurrency === false) {
    return String(item.value);
  }
  return formatInr(item.value);
}

function valueFontSize(text: string, threeColumn: boolean): number {
  if (!threeColumn) {
    return 18;
  }
  if (text.length <= 11) {
    return 14;
  }
  if (text.length <= 14) {
    return 12;
  }
  if (text.length <= 17) {
    return 10;
  }
  return 9;
}

export function KpiGrid({ items, columns = 2 }: Props) {
  const { theme, mode } = useTheme();
  const threeColumn = columns === 3;

  return (
    <View style={[styles.grid, threeColumn ? styles.gridThree : null]}>
      {items.map((item) => {
        const highlighted = item.highlight === true;
        const cardColors = highlighted
          ? {
              backgroundColor: mode === 'dark' ? 'rgba(245, 158, 11, 0.16)' : '#fffbeb',
              borderColor: '#f59e0b',
            }
          : {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
            };
        const labelColor = highlighted
          ? mode === 'dark'
            ? '#fcd34d'
            : '#92400e'
          : theme.textMuted;
        const valueColor = highlighted
          ? mode === 'dark'
            ? '#fbbf24'
            : '#b45309'
          : theme.text;

        const valueText = formatValue(item);

        return (
          <View
            key={item.label}
            style={[styles.kpi, threeColumn ? styles.kpiThree : styles.kpiTwo, cardColors]}
          >
            <Text
              style={[styles.label, threeColumn ? styles.labelThree : null, { color: labelColor }]}
              numberOfLines={2}
            >
              {item.label}
            </Text>
            <Text
              style={[
                styles.value,
                threeColumn ? styles.valueThree : null,
                threeColumn ? { fontSize: valueFontSize(valueText, true) } : null,
                { color: valueColor },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
            >
              {valueText}
            </Text>
          </View>
        );
      })}
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
  gridThree: {
    flexWrap: 'nowrap',
    alignItems: 'stretch',
  },
  kpi: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  kpiTwo: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
  },
  kpiThree: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  labelThree: {
    fontSize: 10,
    marginBottom: 6,
    lineHeight: 14,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
  },
  valueThree: {
    fontSize: 14,
    fontWeight: '800',
  },
});
