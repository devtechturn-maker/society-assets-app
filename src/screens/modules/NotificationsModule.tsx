import { useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NotificationRow } from '../../components/notifications/NotificationRow';
import type { AppNotification } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';

type Props = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onMarkAllRead: () => void;
  onPressNotification: (item: AppNotification) => void;
};

export function NotificationsModule({
  notifications,
  unreadCount,
  loading,
  loadingMore,
  hasMore,
  onRefresh,
  onLoadMore,
  onMarkAllRead,
  onPressNotification,
}: Props) {
  const { theme } = useTheme();
  const endReachedGuard = useRef(false);

  const listHeader = (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
        {unreadCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: theme.accent }]}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount} unread</Text>
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
  );

  if (loading && notifications.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.pageBg }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.flex, { backgroundColor: theme.pageBg }]}
      contentContainerStyle={styles.content}
      data={notifications}
      keyExtractor={(item) => item.notificationId}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyGlyph}>🔔</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No notifications yet</Text>
          <Text style={[styles.emptyCopy, { color: theme.textMuted }]}>
            Visitor approvals and rejections will appear here.
          </Text>
        </View>
      }
      renderItem={({ item }) => <NotificationRow item={item} onPress={onPressNotification} />}
      refreshControl={
        <RefreshControl refreshing={loading && notifications.length > 0} onRefresh={onRefresh} />
      }
      onEndReached={() => {
        if (endReachedGuard.current || !hasMore || loadingMore || loading) {
          return;
        }
        endReachedGuard.current = true;
        onLoadMore();
      }}
      onEndReachedThreshold={0.35}
      onMomentumScrollBegin={() => {
        endReachedGuard.current = false;
      }}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : null
      }
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  headerCopy: { flex: 1, gap: 6 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13, fontWeight: '600' },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  markAllBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  markAllText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 12, gap: 8 },
  emptyGlyph: { fontSize: 34 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyCopy: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
