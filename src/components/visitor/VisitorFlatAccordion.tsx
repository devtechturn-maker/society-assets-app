import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VisitorSummary } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import type { VisitorPhotoPortal } from '../../utils/visitorPhoto';
import { VisitorHistoryRow } from './VisitorHistoryRow';

export type FlatVisitorGroup = {
  flatNumber: string;
  residentName: string;
  visitors: VisitorSummary[];
};

export function groupVisitorsByFlat(items: VisitorSummary[]): FlatVisitorGroup[] {
  const map = new Map<string, FlatVisitorGroup>();
  for (const visitor of items) {
    const existing = map.get(visitor.flatNumber);
    if (existing) {
      existing.visitors.push(visitor);
      continue;
    }
    map.set(visitor.flatNumber, {
      flatNumber: visitor.flatNumber,
      residentName: visitor.residentName,
      visitors: [visitor],
    });
  }
  return Array.from(map.values()).sort((a, b) => a.flatNumber.localeCompare(b.flatNumber));
}

type Props = {
  group: FlatVisitorGroup;
  expanded: boolean;
  photoPortal?: VisitorPhotoPortal;
  expandablePhotos?: boolean;
  memberPendingActions?: boolean;
  onVisitorPress?: (visitorId: string) => void;
  onVisitorResolved?: () => void;
  onToggle: () => void;
};

export function VisitorFlatAccordion({
  group,
  expanded,
  photoPortal = 'gatekeeper',
  expandablePhotos = false,
  memberPendingActions = false,
  onVisitorPress,
  onVisitorResolved,
  onToggle,
}: Props) {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
      <Pressable onPress={onToggle} style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.flat, { color: theme.text }]}>{group.flatNumber}</Text>
          <Text style={[styles.resident, { color: theme.textMuted }]} numberOfLines={1}>
            {group.residentName}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.countPill, { backgroundColor: theme.accentSoft, borderColor: theme.accentGold }]}>
            <Text style={[styles.countText, { color: theme.accentGold }]}>
              {group.visitors.length}
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.textMuted}
          />
        </View>
      </Pressable>

      {expanded ? (
        <View style={[styles.body, { borderTopColor: theme.divider }]}>
          {group.visitors.map((visitor) => (
            <VisitorHistoryRow
              key={visitor.id}
              item={visitor}
              photoPortal={photoPortal}
              expandable={expandablePhotos}
              memberPendingActions={memberPendingActions}
              onPress={onVisitorPress ? () => onVisitorPress(visitor.id) : undefined}
              onResolved={onVisitorResolved}
              compact
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  flat: { fontSize: 17, fontWeight: '800' },
  resident: { fontSize: 13, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countPill: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countText: { fontSize: 12, fontWeight: '800' },
  body: {
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
    gap: 8,
  },
});
