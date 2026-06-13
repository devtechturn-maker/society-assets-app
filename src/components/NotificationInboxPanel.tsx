import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { AppNotification } from '../types/api';

type Props = {
  visible: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onClose: () => void;
  onLoadMore: () => void;
  onMarkAllRead: () => void;
  onPressNotification: (item: AppNotification) => void;
};

function formatWhen(value: string): string {
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

function notificationGlyph(type: string): string {
  if (type.startsWith('POLL')) return '📊';
  if (type.startsWith('GROUP')) return '💬';
  return '🔔';
}

function headline(item: AppNotification): string {
  if (item.subtitle?.trim()) {
    return item.subtitle.trim();
  }
  return item.title?.trim() || 'Notification';
}

function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
}) {
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
            style={[
              styles.rowTitle,
              { color: theme.text, fontWeight: unread ? '800' : '600' },
            ]}
            numberOfLines={1}
          >
            {headline(item)}
          </Text>
          <Text style={[styles.rowTime, { color: theme.textMuted }]}>{formatWhen(item.createdAt)}</Text>
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

export function NotificationInboxPanel({
  visible,
  notifications,
  unreadCount,
  loading,
  loadingMore,
  hasMore,
  onClose,
  onLoadMore,
  onMarkAllRead,
  onPressNotification,
}: Props) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} accessibilityLabel="Close notifications" />
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.pageBg, borderColor: theme.cardBorder },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.textMuted }]} />

          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
              {unreadCount > 0 ? (
                <View style={[styles.headerBadge, { backgroundColor: theme.accent }]}>
                  <Text style={styles.headerBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount} unread
                  </Text>
                </View>
              ) : (
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>All caught up</Text>
              )}
            </View>
            {unreadCount > 0 ? (
              <Pressable
                onPress={onMarkAllRead}
                style={[styles.markAllBtn, { borderColor: theme.accentGold }]}
              >
                <Text style={[styles.markAllText, { color: theme.accentGold }]}>Mark all read</Text>
              </Pressable>
            ) : null}
          </View>

          {loading && notifications.length === 0 ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={theme.accent} />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyGlyph}>🔔</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No notifications yet</Text>
              <Text style={[styles.emptyCopy, { color: theme.textMuted }]}>
                Chat messages, polls, and group updates will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.notificationId}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <NotificationRow item={item} onPress={onPressNotification} />
              )}
              onEndReached={() => {
                if (hasMore && !loadingMore) {
                  onLoadMore();
                }
              }}
              onEndReachedThreshold={0.35}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator color={theme.accent} />
                  </View>
                ) : null
              }
            />
          )}

          <Pressable
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: theme.accentSoft }]}
          >
            <Text style={[styles.closeText, { color: theme.accentGold }]}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type BellProps = {
  unreadCount: number;
  onPress: () => void;
};

export function NotificationBellButton({ unreadCount, onPress }: BellProps) {
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <Pressable style={styles.bellBtn} onPress={onPress} accessibilityLabel="Open notifications">
      <Text style={styles.bellGlyph}>🔔</Text>
      {unreadCount > 0 ? (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{badgeLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  dismissArea: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '78%',
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
    opacity: 0.35,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  headerCopy: { flex: 1, gap: 4 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 13, fontWeight: '600' },
  headerBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  markAllBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  markAllText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  loaderWrap: { paddingVertical: 36, alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 12, gap: 8 },
  emptyGlyph: { fontSize: 34 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyCopy: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  listContent: { gap: 10, paddingBottom: 8 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
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
  closeBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeText: { fontSize: 14, fontWeight: '800' },
  bellBtn: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellGlyph: { fontSize: 20 },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1e1033',
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
});
