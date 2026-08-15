import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { AppNotification } from '../../types/api';

export function formatNotificationWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}

export function notificationGlyph(type: string): string {
  if (type.startsWith('COMPLAINT')) return '⚠';
  if (type.startsWith('GROUP')) return '💬';
  if (type.startsWith('POLL')) return '📊';
  if (type.startsWith('AMENITY')) return '📅';
  if (type.startsWith('RULE')) return '📖';
  if (type.startsWith('NOTICE')) return '📢';
  if (type.startsWith('VISITOR')) return '🚪';
  return '🔔';
}

export function notificationHeadline(item: AppNotification): string {
  if (item.subtitle?.trim()) {
    return item.subtitle.trim();
  }
  return item.title?.trim() || 'Notification';
}

type Props = {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
};

export function NotificationRow({ item, onPress }: Props) {
  const { theme } = useTheme();
  const unread = !item.read;

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: unread ? theme.accentSoft : theme.cardBg,
          borderColor: unread ? theme.accentGold : theme.cardBorder,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      {unread ? <View style={[styles.unreadRail, { backgroundColor: theme.accentGold }]} /> : null}
      <View style={[styles.glyphWrap, { backgroundColor: theme.accentSoft }]}>
        <Text style={styles.glyph}>{notificationGlyph(item.type)}</Text>
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTop}>
          <Text
            style={[styles.rowTitle, { color: theme.text, fontWeight: unread ? '800' : '600' }]}
            numberOfLines={1}
          >
            {notificationHeadline(item)}
          </Text>
          <Text style={[styles.rowTime, { color: theme.textMuted }]}>
            {formatNotificationWhen(item.createdAt)}
          </Text>
        </View>
        <Text
          style={[styles.rowBody, { color: unread ? theme.text : theme.textSoft }]}
          numberOfLines={2}
        >
          {item.body}
        </Text>
      </View>
      {unread ? <View style={[styles.unreadDot, { backgroundColor: theme.accentGold }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 10,
    gap: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  unreadRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  glyphWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 18 },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowTitle: { flex: 1, fontSize: 14 },
  rowTime: { fontSize: 11, fontWeight: '600' },
  rowBody: { marginTop: 3, fontSize: 12, lineHeight: 17 },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
});
