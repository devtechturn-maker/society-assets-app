import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { VisitorSummary } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import type { VisitorPhotoPortal } from '../../utils/visitorPhoto';
import { VisitorApprovalActions } from './VisitorApprovalActions';
import { VisitorAvatar } from './VisitorAvatar';
import { visitorStatusLabel, visitorStatusTone } from '../../utils/visitorStatus';
import { formatDateTime } from '../../utils/format';

type Props = {
  item: VisitorSummary;
  photoPortal?: VisitorPhotoPortal;
  expandable?: boolean;
  compact?: boolean;
  onPress?: () => void;
  memberPendingActions?: boolean;
  onResolved?: () => void;
};

export function VisitorHistoryRow({
  item,
  photoPortal = 'gatekeeper',
  expandable = false,
  compact = false,
  onPress,
  memberPendingActions = false,
  onResolved,
}: Props) {
  const { theme } = useTheme();
  const tone = visitorStatusTone(item.status);
  const showActions = memberPendingActions && item.status === 'PENDING_APPROVAL';

  const header = (
    <View style={styles.rowHeader}>
      <VisitorAvatar visitor={item} photoPortal={photoPortal} size={compact ? 42 : 48} expandable={expandable} />
      <View style={styles.rowMain}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {item.visitorName}
          </Text>
          <View style={[styles.pill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
            <Text style={[styles.pillText, { color: tone.text }]}>{visitorStatusLabel(item.status)}</Text>
          </View>
        </View>
        {!compact ? (
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            Flat {item.flatNumber} · {item.mobileNumber}
          </Text>
        ) : (
          <Text style={[styles.meta, { color: theme.textMuted }]}>{item.mobileNumber}</Text>
        )}
        <Text style={[styles.arrived, { color: theme.textMuted }]}>
          Arrived {formatDateTime(item.createdAt)}
        </Text>
        {item.purpose ? (
          <Text style={[styles.purpose, { color: theme.textSoft }]} numberOfLines={1}>
            {item.purpose}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.row,
        compact ? styles.rowCompact : null,
        showActions ? styles.rowWithActions : null,
        { backgroundColor: theme.chipBg, borderColor: theme.cardBorder },
      ]}
    >
      {onPress ? (
        <Pressable onPress={onPress}>{header}</Pressable>
      ) : (
        header
      )}
      {showActions ? (
        <VisitorApprovalActions
          visitorId={item.id}
          visitorName={item.visitorName}
          onResolved={onResolved}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  rowCompact: { marginBottom: 0 },
  rowWithActions: { gap: 12 },
  rowHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rowMain: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', flex: 1 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  pillText: { fontSize: 10, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 6 },
  arrived: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  purpose: { fontSize: 12, marginTop: 4 },
});
