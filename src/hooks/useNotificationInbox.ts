import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchNotificationsPage,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationReadByTarget,
} from '../services/api';
import {
  connectNotificationRealtime,
  type NotificationRealtimeEvent,
} from '../services/notificationRealtime';
import type { AppNotification } from '../types/api';
import type { AppPushNotification } from '../services/pushNotifications';
import {
  notificationMatchesAudience,
  type NotificationAudience,
} from '../utils/notificationAudience';

const PAGE_SIZE = 21;

function mergeUnique(existing: AppNotification[], incoming: AppNotification[]): AppNotification[] {
  const seen = new Set(existing.map((row) => row.notificationId));
  const appended = incoming.filter((row) => !seen.has(row.notificationId));
  return [...existing, ...appended];
}

function upsertNotification(list: AppNotification[], item: AppNotification): AppNotification[] {
  const without = list.filter((row) => row.notificationId !== item.notificationId);
  return [item, ...without].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function applyReadState(rows: AppNotification[], updated: AppNotification): AppNotification[] {
  return rows.map((row) => (row.notificationId === updated.notificationId ? updated : row));
}

export function useNotificationInbox(userId: string, audience: NotificationAudience | null) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const nextOffsetRef = useRef(0);
  const panelOpenRef = useRef(false);
  const audienceRef = useRef(audience);

  useEffect(() => {
    panelOpenRef.current = panelOpen;
  }, [panelOpen]);

  useEffect(() => {
    audienceRef.current = audience;
  }, [audience]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await fetchUnreadNotificationCount(audienceRef.current);
      setUnreadCount(count);
    } catch {
      /* keep badge */
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    nextOffsetRef.current = 0;
    try {
      const page = await fetchNotificationsPage(PAGE_SIZE, 0, audienceRef.current);
      setNotifications(page.items);
      setHasMore(page.hasMore);
      nextOffsetRef.current = page.nextOffset;
    } catch {
      setNotifications([]);
      setHasMore(false);
      nextOffsetRef.current = 0;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await fetchNotificationsPage(
        PAGE_SIZE,
        nextOffsetRef.current,
        audienceRef.current
      );
      setNotifications((current) => mergeUnique(current, page.items));
      setHasMore(page.hasMore);
      nextOffsetRef.current = page.nextOffset;
    } catch {
      /* keep current page */
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [userId, audience, refreshUnreadCount]);

  useEffect(() => {
    if (panelOpen) {
      void loadInitial();
    }
  }, [audience, panelOpen, loadInitial]);

  useEffect(() => {
    let cancelled = false;
    let disconnect: () => void = () => undefined;

    void connectNotificationRealtime(userId, {
      onEvent: (event: NotificationRealtimeEvent) => {
        if (event.type === 'UNREAD_COUNT') {
          void refreshUnreadCount();
          return;
        }
        const currentAudience = audienceRef.current;
        if (currentAudience && !notificationMatchesAudience(event.notification, currentAudience)) {
          void refreshUnreadCount();
          return;
        }
        setUnreadCount(event.unreadCount);
        if (panelOpenRef.current) {
          setNotifications((current) => upsertNotification(current, event.notification));
        }
      },
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      disconnect = fn;
    });

    return () => {
      cancelled = true;
      disconnect();
    };
  }, [userId, refreshUnreadCount]);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
    void loadInitial();
  }, [loadInitial]);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const applyRead = useCallback((updated: AppNotification) => {
    setNotifications((rows) => applyReadState(rows, updated));
    if (!updated.read) {
      return;
    }
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const markPushNotificationAsRead = useCallback(
    async (push: AppPushNotification) => {
      try {
        if (push.notificationId) {
          const updated = await markNotificationRead(push.notificationId);
          applyRead(updated);
          return;
        }
        const updated = await markNotificationReadByTarget({
          groupId: push.kind === 'chat' ? push.groupId : undefined,
          pollId: push.kind === 'poll' ? push.pollId : undefined,
          complaintId: push.kind === 'complaint' ? push.complaintId : undefined,
        });
        applyRead(updated);
      } catch {
        await refreshUnreadCount();
      }
    },
    [applyRead, refreshUnreadCount]
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      const count = await markAllNotificationsRead(audienceRef.current);
      setUnreadCount(count);
      setNotifications((rows) =>
        rows.map((row) => ({
          ...row,
          read: true,
          readAt: row.readAt ?? new Date().toISOString(),
        }))
      );
    } catch {
      /* ignore */
    }
  }, []);

  const handleOpenNotification = useCallback(
    async (item: AppNotification) => {
      if (!item.read) {
        try {
          const updated = await markNotificationRead(item.notificationId);
          applyRead(updated);
        } catch {
          /* still navigate */
        }
      }
      setPanelOpen(false);
      return item;
    },
    [applyRead]
  );

  return {
    panelOpen,
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    openPanel,
    closePanel,
    loadMore,
    handleMarkAllRead,
    handleOpenNotification,
    markPushNotificationAsRead,
    refreshUnreadCount,
  };
}
