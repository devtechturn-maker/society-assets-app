import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { AppNotification } from '../types/api';

type SectionKey = 'complaints' | 'chats' | 'polls' | 'amenities' | 'rules' | 'notices';

const SECTION_PREVIEW = 3;

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
  if (type.startsWith('COMPLAINT')) return '⚠';
  if (type.startsWith('GROUP')) return '💬';
  if (type.startsWith('POLL')) return '📊';
  if (type.startsWith('AMENITY')) return '📅';
  if (type.startsWith('RULE')) return '📖';
  if (type.startsWith('NOTICE')) return '📢';
  return '🔔';
}

function headline(item: AppNotification): string {
  if (item.subtitle?.trim()) {
    return item.subtitle.trim();
  }
  return item.title?.trim() || 'Notification';
}

function filterBySection(notifications: AppNotification[], section: SectionKey): AppNotification[] {
  if (section === 'complaints') {
    return notifications.filter((n) => n.type.startsWith('COMPLAINT'));
  }
  if (section === 'chats') {
    return notifications.filter((n) => n.type.startsWith('GROUP'));
  }
  if (section === 'polls') {
    return notifications.filter((n) => n.type.startsWith('POLL'));
  }
  if (section === 'rules') {
    return notifications.filter((n) => n.type.startsWith('RULE'));
  }
  if (section === 'notices') {
    return notifications.filter((n) => n.type.startsWith('NOTICE'));
  }
  return notifications.filter((n) => n.type.startsWith('AMENITY'));
}

function sectionTitle(section: SectionKey): string {
  if (section === 'complaints') return 'Complaints';
  if (section === 'chats') return 'Chats';
  if (section === 'polls') return 'Polls';
  if (section === 'rules') return 'Rules';
  if (section === 'notices') return 'Notices';
  return 'Amenities';
}

function sectionEmptyCopy(section: SectionKey): string {
  if (section === 'complaints') return 'No complaint notifications';
  if (section === 'chats') return 'No chat notifications';
  if (section === 'polls') return 'No poll notifications';
  if (section === 'rules') return 'No rule notifications';
  if (section === 'notices') return 'No notice notifications';
  return 'No amenity notifications';
}

const SECTIONS: SectionKey[] = ['complaints', 'chats', 'polls', 'rules', 'notices', 'amenities'];

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

type NotificationSectionProps = {
  section: SectionKey;
  items: AppNotification[];
  visibleCount: number;
  hasMore: boolean;
  loadingMore: boolean;
  onPressNotification: (item: AppNotification) => void;
  onShowMore: (section: SectionKey) => void;
};

function NotificationSection({
  section,
  items,
  visibleCount,
  hasMore,
  loadingMore,
  onPressNotification,
  onShowMore,
}: NotificationSectionProps) {
  const { theme } = useTheme();
  const unreadInSection = items.filter((item) => !item.read).length;
  const visibleItems = items.slice(0, visibleCount);
  const canShowMore = items.length > visibleCount || hasMore;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{sectionTitle(section)}</Text>
        {unreadInSection > 0 ? (
          <Text style={[styles.sectionUnread, { color: theme.accentGold }]}>
            {unreadInSection} unread
          </Text>
        ) : null}
      </View>

      {items.length === 0 ? (
        <Text style={[styles.sectionEmpty, { color: theme.textMuted }]}>{sectionEmptyCopy(section)}</Text>
      ) : (
        <>
          {visibleItems.map((item) => (
            <NotificationRow key={item.notificationId} item={item} onPress={onPressNotification} />
          ))}
          {canShowMore ? (
            <Pressable
              onPress={() => onShowMore(section)}
              disabled={loadingMore}
              style={({ pressed }) => [
                styles.showMoreBtn,
                { borderColor: theme.divider, opacity: pressed || loadingMore ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.showMoreText, { color: theme.accentGold }]}>Show more</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
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
  const [visibleCounts, setVisibleCounts] = useState<Record<SectionKey, number>>({
    complaints: SECTION_PREVIEW,
    chats: SECTION_PREVIEW,
    polls: SECTION_PREVIEW,
    rules: SECTION_PREVIEW,
    notices: SECTION_PREVIEW,
    amenities: SECTION_PREVIEW,
  });
  const prevLoadingMoreRef = useRef(false);

  const sectionItems = useMemo(
    () => ({
      complaints: filterBySection(notifications, 'complaints'),
      chats: filterBySection(notifications, 'chats'),
      polls: filterBySection(notifications, 'polls'),
      rules: filterBySection(notifications, 'rules'),
      notices: filterBySection(notifications, 'notices'),
      amenities: filterBySection(notifications, 'amenities'),
    }),
    [notifications]
  );

  useEffect(() => {
    if (visible) {
      setVisibleCounts({
        complaints: SECTION_PREVIEW,
        chats: SECTION_PREVIEW,
        polls: SECTION_PREVIEW,
        rules: SECTION_PREVIEW,
        notices: SECTION_PREVIEW,
        amenities: SECTION_PREVIEW,
      });
    }
  }, [visible]);

  useEffect(() => {
    if (prevLoadingMoreRef.current && !loadingMore) {
      setVisibleCounts((current) => ({
        complaints: current.complaints + SECTION_PREVIEW,
        chats: current.chats + SECTION_PREVIEW,
        polls: current.polls + SECTION_PREVIEW,
        rules: current.rules + SECTION_PREVIEW,
        notices: current.notices + SECTION_PREVIEW,
        amenities: current.amenities + SECTION_PREVIEW,
      }));
    }
    prevLoadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  function showMore(section: SectionKey) {
    const items = sectionItems[section];
    if (visibleCounts[section] < items.length) {
      setVisibleCounts((current) => ({
        ...current,
        [section]: current[section] + SECTION_PREVIEW,
      }));
      return;
    }
    if (hasMore && !loadingMore) {
      onLoadMore();
    }
  }

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
                Complaints, chats, and polls will appear here.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.sectionsScroll}
              contentContainerStyle={styles.sectionsContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {SECTIONS.map((section) => (
                <NotificationSection
                  key={section}
                  section={section}
                  items={sectionItems[section]}
                  visibleCount={visibleCounts[section]}
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                  onPressNotification={onPressNotification}
                  onShowMore={showMore}
                />
              ))}
              {loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator color={theme.accent} />
                </View>
              ) : null}
            </ScrollView>
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
  sectionsScroll: { flexGrow: 0 },
  sectionsContent: { paddingBottom: 8 },
  section: { marginBottom: 18 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  sectionUnread: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionEmpty: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  showMoreBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 2,
  },
  showMoreText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  footerLoader: { paddingVertical: 12, alignItems: 'center' },
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
    minWidth: 38,
    height: 38,
    paddingHorizontal: 6,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellGlyph: { fontSize: 18 },
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
