import { FlatList, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { WIZARD_ACCENT } from './wizardStyles';

type Props = {
  numbers: string[];
  emptyMessage?: string;
};

/** Virtualized list of every generated flat number. */
export function FlatNumberFullList({ numbers, emptyMessage = 'Adjust options to generate flat numbers.' }: Props) {
  if (numbers.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>All flat numbers</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{numbers.length}</Text>
        </View>
      </View>
      <Text style={styles.rangeHint}>
        {numbers[0]} → {numbers[numbers.length - 1]}
      </Text>
      <FlatList
        data={numbers}
        keyExtractor={(item, index) => `${item}-${index}`}
        numColumns={3}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        initialNumToRender={48}
        maxToRenderPerBatch={60}
        windowSize={10}
        removeClippedSubviews
        renderItem={({ item }) => (
          <View style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              {item}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: '#fff',
    overflow: 'hidden',
    minHeight: 180,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy900,
  },
  countBadge: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: WIZARD_ACCENT,
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  rangeHint: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  chip: {
    flex: 1,
    margin: 4,
    minWidth: '28%',
    maxWidth: '31%',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#f3e8ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: WIZARD_ACCENT,
  },
  emptyBox: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    textAlign: 'center',
  },
});
