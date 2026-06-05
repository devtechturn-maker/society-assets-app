import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardEvent,
} from 'react-native';
import {
  CHAT_MESSAGE_PAGE_SIZE,
  createChatGroup,
  fetchChatGroups,
  fetchGroupChatThread,
  fetchMembers,
  markGroupChatRead,
  sendGroupChatMessage,
} from '../../services/api';
import type { ChatGroupSummary, ChatMessage, ChatThread, SocietyMember } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { ListEmpty, ListError } from '../../components/dashboard/ListStates';

const POLL_MS = 5000;
const BOTTOM_TAB_BAR_HEIGHT = 62;
const BOTTOM_SCROLL_THRESHOLD_PX = 72;
const TOP_SCROLL_THRESHOLD_PX = 80;

type Screen = 'list' | 'create' | 'chat';

type ThreadRow =
  | { kind: 'divider'; key: string }
  | { kind: 'message'; key: string; message: ChatMessage };

function normalizeThread(data: ChatThread): ChatThread {
  return {
    ...data,
    unreadCount: Number(data.unreadCount ?? 0),
    hasMoreOlder: Boolean(data.hasMoreOlder),
    firstUnreadMessageId: data.firstUnreadMessageId ? String(data.firstUnreadMessageId) : null,
    messages: Array.isArray(data.messages) ? data.messages : [],
  };
}

function unreadBadgeLabel(count: number): string {
  const value = Number(count ?? 0);
  if (value > 99) return '99+';
  return String(value);
}

function resolveFirstUnreadMessageId(thread: ChatThread): string | null {
  const unreadCount = Math.max(0, Math.floor(Number(thread.unreadCount ?? 0)));
  if (unreadCount <= 0) return null;

  let othersFromEnd = 0;
  for (let i = thread.messages.length - 1; i >= 0; i--) {
    const message = thread.messages[i];
    if (message.mine) continue;
    othersFromEnd++;
    if (othersFromEnd === unreadCount) {
      return String(message.id);
    }
  }
  return null;
}

function buildThreadRows(
  messages: ChatMessage[],
  firstUnreadMessageId: string | null,
  openedUnreadCount: number
): ThreadRow[] {
  const rows: ThreadRow[] = [];
  for (const message of messages) {
    if (
      openedUnreadCount > 0 &&
      firstUnreadMessageId &&
      String(message.id) === firstUnreadMessageId
    ) {
      rows.push({ kind: 'divider', key: 'unread-divider' });
    }
    rows.push({ kind: 'message', key: String(message.id), message });
  }
  return rows;
}

function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (event: KeyboardEvent) => {
      const overlap = Math.max(0, event.endCoordinates.height - BOTTOM_TAB_BAR_HEIGHT);
      setInset(overlap);
    };
    const onHide = () => setInset(0);
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return inset;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function UnreadDivider({ count }: { count: number }) {
  return (
    <View style={styles.unreadDivider}>
      <Text style={styles.unreadDividerText}>
        {unreadBadgeLabel(count)} unread message{count === 1 ? '' : 's'}
      </Text>
    </View>
  );
}

const MessageBubble = memo(function MessageBubble({ message }: { message: ChatMessage }) {
  const { theme } = useTheme();
  const mine = message.mine;
  return (
    <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
      <View
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: theme.accent, borderBottomRightRadius: 4 }
            : { backgroundColor: theme.chipBg, borderBottomLeftRadius: 4 },
        ]}
      >
        {!mine ? (
          <Text style={[styles.senderName, { color: theme.textMuted }]}>{message.senderName}</Text>
        ) : null}
        <Text style={[styles.bubbleText, { color: mine ? '#fff' : theme.text }]}>{message.body}</Text>
        <Text style={[styles.bubbleTime, { color: mine ? 'rgba(255,255,255,0.75)' : theme.textMuted }]}>
          {formatTime(message.sentAt)}
        </Text>
      </View>
    </View>
  );
});

function ChatComposer({
  sending,
  onSend,
  onFocus,
}: {
  sending: boolean;
  onSend: (text: string) => Promise<void>;
  onFocus?: () => void;
}) {
  const { theme } = useTheme();
  const [text, setText] = useState('');

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText('');
    await onSend(trimmed);
  };

  return (
    <View style={[styles.composer, { backgroundColor: theme.cardBg, borderTopColor: theme.cardBorder }]}>
      <TextInput
        style={[styles.composerInput, { color: theme.text, backgroundColor: theme.chipBg }]}
        placeholder="Type a message…"
        placeholderTextColor={theme.textMuted}
        value={text}
        onChangeText={setText}
        onFocus={onFocus}
        multiline
        maxLength={2000}
      />
      <Pressable
        style={[styles.sendBtn, { backgroundColor: theme.accent, opacity: sending || !text.trim() ? 0.5 : 1 }]}
        onPress={submit}
        disabled={sending || !text.trim()}
      >
        {sending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.sendBtnText}>Send</Text>
        )}
      </Pressable>
    </View>
  );
}

function GroupListScreen({
  memberPortal,
  canManageGroups,
  onOpenGroup,
  onCreateGroup,
  refreshToken,
}: {
  memberPortal: boolean;
  canManageGroups: boolean;
  onOpenGroup: (groupId: string) => void;
  onCreateGroup: () => void;
  refreshToken: number;
}) {
  const { theme } = useTheme();
  const [groups, setGroups] = useState<ChatGroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchChatGroups(memberPortal);
      setGroups(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      if (!silent) {
        setError(e instanceof Error ? e.message : 'Could not load groups');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [memberPortal]);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [load, refreshToken]);

  if (loading && groups.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (error && groups.length === 0) {
    return (
      <View style={styles.centered}>
        <ListError message={error} />
        <Pressable onPress={() => load()} style={{ marginTop: 12 }}>
          <Text style={{ color: theme.accent, fontWeight: '700' }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.pageBg }]}>
      <View style={[styles.listHeader, { backgroundColor: theme.cardBg, borderBottomColor: theme.cardBorder }]}>
        <Text style={[styles.threadTitle, { color: theme.text }]}>Chat Groups</Text>
        <Text style={[styles.threadSub, { color: theme.textMuted }]}>
          {canManageGroups
            ? 'Create groups and add specific members'
            : 'Groups you were added to by the chairman'}
        </Text>
        {canManageGroups ? (
          <Pressable style={[styles.createBtn, { backgroundColor: theme.accent }]} onPress={onCreateGroup}>
            <Text style={styles.createBtnText}>+ New Group</Text>
          </Pressable>
        ) : null}
      </View>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.conversationId}
        contentContainerStyle={styles.groupList}
        ListEmptyComponent={
          <ListEmpty
            message={
              canManageGroups
                ? 'No groups yet. Create one and add members.'
                : 'You are not in any chat group yet.'
            }
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.groupCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
            onPress={() => onOpenGroup(item.conversationId)}
          >
            <View style={styles.groupCardTop}>
              <Text style={[styles.groupName, { color: theme.text }]}>{item.groupName}</Text>
              {item.unreadCount > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadBadgeLabel(item.unreadCount)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.groupMeta, { color: theme.textMuted }]}>
              {item.memberCount} member{item.memberCount === 1 ? '' : 's'}
              {item.lastMessagePreview ? ` · ${item.lastMessagePreview}` : ''}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function CreateGroupScreen({
  onCreated,
  onCancel,
}: {
  onCreated: (groupId: string) => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [members, setMembers] = useState<SocietyMember[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers()
      .then((rows) => setMembers(Array.isArray(rows) ? rows : []))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Could not load members');
      })
      .finally(() => setLoadingMembers(false));
  }, []);

  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || selected.size === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createChatGroup(trimmed, [...selected]);
      onCreated(created.conversationId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not create group');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.pageBg }]}>
      <View style={[styles.listHeader, { backgroundColor: theme.cardBg, borderBottomColor: theme.cardBorder }]}>
        <Pressable onPress={onCancel}>
          <Text style={{ color: theme.accent, fontWeight: '700' }}>← Back</Text>
        </Pressable>
        <Text style={[styles.threadTitle, { color: theme.text, marginTop: 8 }]}>New Group</Text>
        <TextInput
          style={[styles.nameInput, { color: theme.text, backgroundColor: theme.chipBg }]}
          placeholder="Group name"
          placeholderTextColor={theme.textMuted}
          value={name}
          onChangeText={setName}
          maxLength={120}
        />
      </View>
      {loadingMembers ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.groupList}
          ListEmptyComponent={<ListEmpty message="No society members found." />}
          renderItem={({ item }) => {
            const checked = selected.has(item.id);
            return (
              <Pressable
                style={[styles.memberRow, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
                onPress={() => toggleMember(item.id)}
              >
                <View style={[styles.checkbox, checked ? { backgroundColor: theme.accent } : null]}>
                  {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.groupName, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.groupMeta, { color: theme.textMuted }]}>
                    {item.flatNumber} · {item.email}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
      {error ? <Text style={[styles.inlineError, { color: '#c0392b' }]}>{error}</Text> : null}
      <Pressable
        style={[
          styles.saveBtn,
          { backgroundColor: theme.accent, opacity: saving || !name.trim() || selected.size === 0 ? 0.5 : 1 },
        ]}
        onPress={submit}
        disabled={saving || !name.trim() || selected.size === 0}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.createBtnText}>Create Group ({selected.size} members)</Text>
        )}
      </Pressable>
    </View>
  );
}

function GroupChatScreen({
  memberPortal,
  groupId,
  onBack,
}: {
  memberPortal: boolean;
  groupId: string;
  onBack: () => void;
}) {
  const { theme } = useTheme();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [openedUnreadCount, setOpenedUnreadCount] = useState(0);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
  const [nearBottom, setNearBottom] = useState(true);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const listRef = useRef<FlatList<ThreadRow>>(null);
  const keyboardInset = useKeyboardInset();
  const scrollOffsetRef = useRef(0);
  const contentHeightRef = useRef(0);
  const openedUnreadCountRef = useRef(0);
  const nearBottomRef = useRef(true);
  const latestMessageIdRef = useRef<string | null>(null);
  const initialScrollDoneRef = useRef(false);
  const loadingOlderRef = useRef(false);

  useEffect(() => {
    openedUnreadCountRef.current = openedUnreadCount;
  }, [openedUnreadCount]);

  useEffect(() => {
    nearBottomRef.current = nearBottom;
  }, [nearBottom]);

  const markGroupRead = useCallback(async () => {
    await markGroupChatRead(memberPortal, groupId).catch(() => undefined);
  }, [memberPortal, groupId]);

  const clearActiveChatUnread = useCallback(async () => {
    setOpenedUnreadCount(0);
    setFirstUnreadMessageId(null);
    await markGroupRead();
  }, [markGroupRead]);

  useEffect(() => {
    loadingOlderRef.current = loadingOlder;
  }, [loadingOlder]);

  const loadOlderMessages = useCallback(
    async (onComplete?: () => void) => {
      if (!thread?.messages.length || loadingOlderRef.current || !hasMoreOlder) {
        onComplete?.();
        return;
      }

      const oldestId = String(thread.messages[0].id);
      const scrollHeightBefore = contentHeightRef.current;
      loadingOlderRef.current = true;
      setLoadingOlder(true);
      try {
        const page = normalizeThread(
          await fetchGroupChatThread(memberPortal, groupId, {
            limit: CHAT_MESSAGE_PAGE_SIZE,
            before: oldestId,
          })
        );
        const existingIds = new Set(thread.messages.map((message) => String(message.id)));
        const older = page.messages.filter((message) => !existingIds.has(String(message.id)));
        if (older.length > 0) {
          setThread((prev) => (prev ? { ...prev, messages: [...older, ...prev.messages] } : prev));
        }
        setHasMoreOlder(Boolean(page.hasMoreOlder));
        requestAnimationFrame(() => {
          const delta = contentHeightRef.current - scrollHeightBefore;
          if (delta > 0) {
            listRef.current?.scrollToOffset({
              offset: scrollOffsetRef.current + delta,
              animated: false,
            });
          }
          onComplete?.();
        });
      } catch {
        onComplete?.();
      } finally {
        loadingOlderRef.current = false;
        setLoadingOlder(false);
      }
    },
    [thread, hasMoreOlder, memberPortal, groupId]
  );

  const ensureUnreadAnchorLoaded = useCallback(
    async (onComplete: () => void) => {
      let currentThread = thread;
      let more = hasMoreOlder;
      const anchorId = firstUnreadMessageId;
      const unread = openedUnreadCount;

      while (
        unread > 0 &&
        anchorId &&
        currentThread?.messages.length &&
        !currentThread.messages.some((message) => String(message.id) === anchorId) &&
        more
      ) {
        const scrollHeightBefore = contentHeightRef.current;
        const oldestId = String(currentThread.messages[0].id);
        setLoadingOlder(true);
        try {
          const page = normalizeThread(
            await fetchGroupChatThread(memberPortal, groupId, {
              limit: CHAT_MESSAGE_PAGE_SIZE,
              before: oldestId,
            })
          );
          const existingIds = new Set(currentThread.messages.map((message) => String(message.id)));
          const older = page.messages.filter((message) => !existingIds.has(String(message.id)));
          currentThread = { ...currentThread, messages: [...older, ...currentThread.messages] };
          setThread(currentThread);
          more = Boolean(page.hasMoreOlder);
          setHasMoreOlder(more);
          requestAnimationFrame(() => {
            const delta = contentHeightRef.current - scrollHeightBefore;
            if (delta > 0) {
              listRef.current?.scrollToOffset({
                offset: scrollOffsetRef.current + delta,
                animated: false,
              });
            }
          });
        } finally {
          setLoadingOlder(false);
        }
      }
      onComplete();
    },
    [thread, hasMoreOlder, firstUnreadMessageId, openedUnreadCount, memberPortal, groupId]
  );

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        if (!silent) {
          const data = await fetchGroupChatThread(memberPortal, groupId, {
            limit: CHAT_MESSAGE_PAGE_SIZE,
          });
          const normalized = normalizeThread(data);
          const unread = Number(data.unreadCount ?? 0);
          setThread(normalized);
          setHasMoreOlder(Boolean(data.hasMoreOlder));
          setOpenedUnreadCount(unread);
          setFirstUnreadMessageId(
            normalized.firstUnreadMessageId ?? resolveFirstUnreadMessageId(normalized)
          );
          setNearBottom(unread === 0);
          initialScrollDoneRef.current = false;
          return;
        }

        const latestId = latestMessageIdRef.current;
        if (!latestId) return;

        const page = await fetchGroupChatThread(memberPortal, groupId, { after: latestId });
        const added = Array.isArray(page.messages) ? page.messages : [];
        if (added.length === 0) return;

        setThread((prev) => {
          if (!prev) return prev;
          const prevIds = new Set(prev.messages.map((message) => String(message.id)));
          const fresh = added.filter((message) => !prevIds.has(String(message.id)));
          if (fresh.length === 0) return prev;
          return { ...prev, messages: [...prev.messages, ...fresh] };
        });

        let nextFirstUnread: string | null = null;
        setOpenedUnreadCount((count) => {
          let next = count;
          for (const message of added) {
            if (message.mine) continue;
            if (next === 0) {
              nextFirstUnread = String(message.id);
            }
            next++;
          }
          return next;
        });
        if (nextFirstUnread) {
          setFirstUnreadMessageId(nextFirstUnread);
        }
      } catch (e: unknown) {
        if (!silent) {
          setError(e instanceof Error ? e.message : 'Could not load chat');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [memberPortal, groupId]
  );

  useEffect(() => {
    setThread(null);
    setError(null);
    setLoading(true);
    setOpenedUnreadCount(0);
    setFirstUnreadMessageId(null);
    setNearBottom(true);
    setHasMoreOlder(false);
    setLoadingOlder(false);
    scrollOffsetRef.current = 0;
    contentHeightRef.current = 0;
    initialScrollDoneRef.current = false;
    load();
    const timer = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const scrollToEnd = useCallback((animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 50);
  }, []);

  const scrollToUnreadAnchor = useCallback(() => {
    const rows = buildThreadRows(thread?.messages ?? [], firstUnreadMessageId, openedUnreadCount);
    const dividerIndex = rows.findIndex((row) => row.kind === 'divider');
    if (dividerIndex < 0) return;
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: dividerIndex, viewPosition: 0.42, animated: false });
      setNearBottom(false);
    }, 80);
  }, [thread?.messages, firstUnreadMessageId, openedUnreadCount]);

  useEffect(() => {
    latestMessageIdRef.current = thread?.messages.length
      ? String(thread.messages[thread.messages.length - 1].id)
      : null;
  }, [thread?.messages]);

  useEffect(() => {
    if (!thread || initialScrollDoneRef.current) return;
    if (openedUnreadCount > 0) {
      setNearBottom(false);
      void ensureUnreadAnchorLoaded(() => {
        if (firstUnreadMessageId) {
          scrollToUnreadAnchor();
        } else {
          scrollToEnd(false);
        }
        initialScrollDoneRef.current = true;
      });
      return;
    }
    if (thread.messages.length > 0) {
      scrollToEnd(false);
      setNearBottom(true);
    }
    initialScrollDoneRef.current = true;
  }, [
    thread,
    openedUnreadCount,
    firstUnreadMessageId,
    scrollToEnd,
    scrollToUnreadAnchor,
    ensureUnreadAnchorLoaded,
  ]);

  useEffect(() => {
    if (keyboardInset > 0 && nearBottom) scrollToEnd();
  }, [keyboardInset, nearBottom, scrollToEnd]);

  const handleContentSizeChange = useCallback(
    (_width: number, height: number) => {
      const previousHeight = contentHeightRef.current;
      const delta = height - previousHeight;
      contentHeightRef.current = height;
      if (delta <= 0 || previousHeight === 0) return;

      const atBottom = nearBottomRef.current;
      const hasUnread = openedUnreadCountRef.current > 0;
      if (atBottom && !hasUnread) {
        scrollToEnd(false);
        return;
      }

      listRef.current?.scrollToOffset({
        offset: scrollOffsetRef.current + delta,
        animated: false,
      });
    },
    [scrollToEnd]
  );

  const handleScroll = useCallback(
    (offsetY: number, contentHeight: number, layoutHeight: number) => {
      scrollOffsetRef.current = offsetY;
      const isNearBottom =
        contentHeight - offsetY - layoutHeight <= BOTTOM_SCROLL_THRESHOLD_PX;
      setNearBottom(isNearBottom);
      if (offsetY <= TOP_SCROLL_THRESHOLD_PX && hasMoreOlder && !loadingOlderRef.current) {
        void loadOlderMessages();
      }
    },
    [hasMoreOlder, loadOlderMessages]
  );

  const handleSend = async (body: string) => {
    setSending(true);
    try {
      const message = await sendGroupChatMessage(memberPortal, groupId, body);
      setThread((prev) => {
        if (!prev) return prev;
        if (prev.messages.some((row) => String(row.id) === String(message.id))) return prev;
        return { ...prev, messages: [...prev.messages, message] };
      });
      scrollToEnd();
      await clearActiveChatUnread();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const handleBack = async () => {
    await clearActiveChatUnread();
    onBack();
  };

  const rows = useMemo(
    () => buildThreadRows(thread?.messages ?? [], firstUnreadMessageId, openedUnreadCount),
    [thread?.messages, firstUnreadMessageId, openedUnreadCount]
  );
  const groupTitle = thread?.groupName ?? 'Chat Group';

  const renderThreadRow = useCallback(
    ({ item }: { item: ThreadRow }) =>
      item.kind === 'divider' ? (
        <UnreadDivider count={openedUnreadCount} />
      ) : (
        <MessageBubble message={item.message} />
      ),
    [openedUnreadCount]
  );

  if (loading && !thread) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (error && !thread) {
    return (
      <View style={styles.centered}>
        <ListError message={error} />
        <Pressable onPress={() => load()} style={{ marginTop: 12 }}>
          <Text style={{ color: theme.accent, fontWeight: '700' }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.pageBg, paddingBottom: keyboardInset }]}>
      <View style={[styles.threadHeader, { backgroundColor: theme.cardBg, borderBottomColor: theme.cardBorder }]}>
        <Pressable onPress={handleBack}>
          <Text style={{ color: theme.accent, fontWeight: '700' }}>← Groups</Text>
        </Pressable>
        <Text style={[styles.threadTitle, { color: theme.text, marginTop: 6 }]}>{groupTitle}</Text>
        <Text style={[styles.threadSub, { color: theme.textMuted }]}>
          {thread?.memberCount ?? 0} members in this group
        </Text>
      </View>
      <FlatList
        ref={listRef}
        style={styles.messageScroll}
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={renderThreadRow}
        contentContainerStyle={styles.messageList}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={18}
        maxToRenderPerBatch={12}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={<ListEmpty message="No messages yet. Start the conversation." />}
        ListHeaderComponent={
          loadingOlder ? (
            <Text style={[styles.historyLoading, { color: theme.textMuted }]}>Loading older messages…</Text>
          ) : null
        }
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          handleScroll(contentOffset.y, contentSize.height, layoutMeasurement.height);
        }}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}
        onScrollToIndexFailed={() => scrollToEnd(false)}
        onLayout={() => {
          if (keyboardInset > 0 && nearBottom) scrollToEnd();
        }}
      />
      <ChatComposer
        sending={sending}
        onSend={handleSend}
        onFocus={() => {
          if (nearBottom) scrollToEnd();
        }}
      />
    </View>
  );
}

export function ChatModule({
  memberPortal = false,
  userId,
  canManageGroups = false,
  initialGroupId,
  onInitialGroupConsumed,
}: {
  memberPortal?: boolean;
  userId?: string;
  canManageGroups?: boolean;
  initialGroupId?: string | null;
  onInitialGroupConsumed?: () => void;
}): ReactNode {
  const [screen, setScreen] = useState<Screen>(initialGroupId ? 'chat' : 'list');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(initialGroupId ?? null);
  const [listRefreshToken, setListRefreshToken] = useState(0);

  useEffect(() => {
    if (initialGroupId) {
      setActiveGroupId(initialGroupId);
      setScreen('chat');
      onInitialGroupConsumed?.();
    }
  }, [initialGroupId, onInitialGroupConsumed, userId]);

  if (screen === 'create') {
    return (
      <CreateGroupScreen
        onCancel={() => setScreen('list')}
        onCreated={(groupId) => {
          setActiveGroupId(groupId);
          setScreen('chat');
        }}
      />
    );
  }

  if (screen === 'chat' && activeGroupId) {
    return (
      <GroupChatScreen
        memberPortal={memberPortal}
        groupId={activeGroupId}
        onBack={() => {
          setListRefreshToken((token) => token + 1);
          setScreen('list');
          setActiveGroupId(null);
        }}
      />
    );
  }

  return (
    <GroupListScreen
      memberPortal={memberPortal}
      canManageGroups={canManageGroups}
      refreshToken={listRefreshToken}
      onOpenGroup={(groupId) => {
        setActiveGroupId(groupId);
        setScreen('chat');
      }}
      onCreateGroup={() => setScreen('create')}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  listHeader: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  threadHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  threadTitle: { fontSize: 18, fontWeight: '800' },
  threadSub: { fontSize: 13, marginTop: 2 },
  createBtn: { marginTop: 12, alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  createBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  groupList: { padding: 12, gap: 10, flexGrow: 1 },
  groupCard: { borderWidth: 1, borderRadius: 12, padding: 14 },
  groupCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  groupName: { fontSize: 16, fontWeight: '700', flex: 1 },
  groupMeta: { fontSize: 13, marginTop: 4 },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    backgroundColor: '#25d366',
  },
  unreadBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  unreadDivider: { alignItems: 'center', marginVertical: 10 },
  unreadDividerText: {
    backgroundColor: '#dcf8c6',
    color: '#1e4620',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  nameInput: { marginTop: 10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 10, padding: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: { color: '#fff', fontWeight: '800', fontSize: 14 },
  saveBtn: { margin: 12, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  inlineError: { paddingHorizontal: 16, paddingBottom: 8, fontSize: 13 },
  messageScroll: { flex: 1 },
  messageList: { padding: 12, paddingBottom: 8, flexGrow: 1 },
  bubbleRow: { marginBottom: 10, flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  senderName: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 1 },
  composerInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, minWidth: 64, alignItems: 'center' },
  sendBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  historyLoading: { textAlign: 'center', fontSize: 12, paddingVertical: 10 },
});
