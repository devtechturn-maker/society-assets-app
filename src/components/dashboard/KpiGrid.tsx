import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { formatInr } from '../../utils/format';

const HIGHLIGHT_KPI_BORDER = '#D8B4E8';
const HIGHLIGHT_RAIL = '#70088c';
const PAGE_SOFT = '#F3E8FB';

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
    return 22;
  }
  if (text.length <= 9) {
    return 16;
  }
  if (text.length <= 12) {
    return 14;
  }
  if (text.length <= 15) {
    return 12;
  }
  return 11;
}

function iconForLabel(label: string): keyof typeof Ionicons.glyphMap {
  const key = label.trim().toLowerCase();
  if (key.includes('last')) return 'wallet-outline';
  if (key.includes('total')) return 'cash-outline';
  if (key.includes('pending')) return 'alert-circle-outline';
  return 'stats-chart-outline';
}

export function KpiGrid({ items, columns = 2 }: Props) {
  const { theme } = useTheme();
  const threeColumn = columns === 3;

  return (
    <View style={[styles.grid, threeColumn ? styles.gridThree : null]}>
      {items.map((item) => {
        const highlighted = item.highlight === true;
        const cardColors = highlighted
          ? {
              backgroundColor: PAGE_SOFT,
              borderColor: HIGHLIGHT_KPI_BORDER,
            }
          : {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
            };
        const labelColor = highlighted ? theme.accent : theme.textMuted;
        const valueColor = highlighted ? theme.accent : theme.text;
        const iconName = iconForLabel(item.label);
        const valueText = formatValue(item);

        return (
          <View
            key={item.label}
            style={[
              styles.kpi,
              threeColumn ? styles.kpiThree : styles.kpiTwo,
              cardColors,
              styles.kpiShadow,
              highlighted ? styles.kpiHighlight : null,
            ]}
          >
            {highlighted ? <View style={[styles.highlightRail, { backgroundColor: HIGHLIGHT_RAIL }]} /> : null}
            <View style={styles.kpiTop}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: highlighted ? 'rgba(112, 8, 140, 0.12)' : PAGE_SOFT,
                  },
                ]}
              >
                <Ionicons name={iconName} size={16} color={highlighted ? theme.accent : theme.accentGold} />
              </View>
              <Text
                style={[styles.label, threeColumn ? styles.labelThree : null, { color: labelColor }]}
                numberOfLines={2}
              >
                {item.label}
              </Text>
            </View>
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
    gap: 12,
    marginBottom: 4,
  },
  gridThree: {
    flexWrap: 'nowrap',
    alignItems: 'stretch',
  },
  kpi: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  kpiShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#70088c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  kpiHighlight: {
    borderWidth: 1.5,
  },
  highlightRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 10,
    paddingVertical: 14,
    paddingLeft: 14,
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 14,
  },
  labelThree: {
    fontSize: 10,
    lineHeight: 13,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  valueThree: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
