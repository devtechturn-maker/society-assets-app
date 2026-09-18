import { StyleSheet, Text, View } from 'react-native';
import type { VisitorSummary } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { VisitorAvatar } from './VisitorAvatar';
import { visitorStatusLabel, visitorStatusTone } from '../../utils/visitorStatus';
import type { VisitorPhotoPortal } from '../../utils/visitorPhoto';

type Props = {
  visitor: VisitorSummary;
  /** When set, photos can expand in lightbox. */
  photoPortal?: VisitorPhotoPortal | false;
};

export function RecentVisitorRow({ visitor, photoPortal = false }: Props) {
  const { theme } = useTheme();
  const tone = visitorStatusTone(visitor.status);
  const expandable = photoPortal === 'society' || photoPortal === 'member' || photoPortal === 'gatekeeper';

  return (
    <View style={[styles.row, { backgroundColor: theme.chipBg, borderColor: theme.cardBorder }]}>
      {expandable ? (
        <VisitorAvatar visitor={visitor} photoPortal={photoPortal as VisitorPhotoPortal} size={44} expandable />
      ) : (
        <VisitorAvatar visitor={visitor} memberPortal={false} size={44} />
      )}
      <View style={styles.main}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {visitor.visitorName}
        </Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Flat {visitor.flatNumber} · {visitor.mobileNumber}
        </Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
        <Text style={[styles.statusText, { color: tone.text }]}>{visitorStatusLabel(visitor.status)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  main: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 2 },
  statusPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
});
