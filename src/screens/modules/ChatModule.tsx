import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
  closePoll,
  createChatGroup,
  createGroupChatPoll,
  fetchChatGroups,
  fetchGroupChatThread,
  fetchMembers,
  fetchPollDetail,
  markGroupChatRead,
  sendGroupChatMessage,
  sendGroupChatMessageWithPhoto,
  voteOnPoll,
} from '../../services/api';
import {
  connectChatRealtime,
  disconnectChatRealtime,
  publishChatTyping,
  type ChatRealtimeEvent,
} from '../../services/chatRealtime';
import type { ChatGroupSummary, ChatMessage, ChatThread, PollDetail, SocietyMember } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { ListEmpty, ListError } from '../../components/dashboard/ListStates';
import { useHardwareBack } from '../../hooks/useHardwareBack';
import { useAppAlert } from '../../context/AppAlertContext';
import { CreatePollModal } from '../../components/chat/CreatePollModal';
import { EditGroupMembersModal } from '../../components/chat/EditGroupMembersModal';
import { PollMessageBubble } from '../../components/chat/PollMessageBubble';
import { AuthenticatedImage } from '../../components/chat/AuthenticatedImage';
import {
  pickPhotoFromCamera,
  pickPhotoFromLibrary,
  showPhotoSourcePicker,
  type PickedPhoto,
} from '../../utils/pickPhoto';
import {
  appendMessageIfNew,
  normalizeThread,
  resolveFirstUnreadMessageId,
  unreadBadgeLabel,
} from '../../utils/chatThreadHelpers';
import {
  buildPresentationRows,
  createLocalClientId,
  formatSmartChatTime,
  resolveDeliveryStatus,
  type PresentationRow,
} from '../../utils/chatPresentation';

const POLL_MS = 30000;
const TYPING_CLEAR_MS = 3000;
const TYPING_DEBOUNCE_MS = 1200;
const BOTTOM_TAB_BAR_HEIGHT = 62;
const BOTTOM_SCROLL_THRESHOLD_PX = 72;
const TOP_SCROLL_THRESHOLD_PX = 80;

type Screen = 'list' | 'create' | 'chat';

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

async function hydratePollMessages(
  messages: ChatMessage[],
  memberPortal: boolean
): Promise<ChatMessage[]> {
  const needsPoll = messages.filter(
    (message) =>
      (message.messageType === 'POLL' || message.pollId) && !message.poll && message.pollId
  );
  if (needsPoll.length === 0) {
    return messages;
  }
  const pollById = new Map<string, PollDetail>();
  await Promise.all(
    needsPoll.map(async (message) => {
      const pollId = String(message.pollId);
      if (pollById.has(pollId)) return;
      try {
        const poll = await fetchPollDetail(memberPortal, pollId);
        pollById.set(pollId, poll);
      } catch {
        /* ignore missing poll */
      }
    })
  );
  if (pollById.size === 0) {
    return messages;
  }
  return messages.map((message) => {
    const pollId = message.pollId ? String(message.pollId) : '';
    const poll = pollId ? pollById.get(pollId) : undefined;
    if (!poll) return message;
    return { ...message, poll, messageType: 'POLL' as const };
  });
}

function formatBubbleTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function isPersistedMessageId(id: string | null | undefined): boolean {
  if (!id) return false;
  return !String(id).startsWith('local-');
}

function DeliveryTicks({ message }: { message: ChatMessage }) {
  const { theme } = useTheme();
  if (!message.mine) return null;
  const status = resolveDeliveryStatus(message);
  if (status === 'failed') {
    return <Text style={[styles.deliveryTick, styles.deliveryTickFailed]}>!</Text>;
  }
  if (status === 'sending') {
    return <Text style={[styles.deliveryTick, { color: 'rgba(255,255,255,0.75)' }]}>◌</Text>;
  }
  if (status === 'read') {
    // accentGold contrasts on accent-colored mine bubbles (accent-on-accent would vanish)
    return <Text style={[styles.deliveryTick, { color: theme.accentGold }]}>✓✓</Text>;
  }
  return <Text style={[styles.deliveryTick, { color: 'rgba(255,255,255,0.75)' }]}>✓</Text>;
}

function DateChip({ label }: { label: string }) {
  const { theme } = useTheme();
  if (!label) return null;
  return (
    <View style={styles.dateChipWrap}>
      <Text style={[styles.dateChipText, { color: theme.textMuted, backgroundColor: theme.chipBg }]}>
        {label}
      </Text>
    </View>
  );
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

const MessageBubble = memo(function MessageBubble({
  message,
  memberPortal,
  canManageGroups,
  showSenderMeta,
  clusteredWithPrevious,
  onVote,
  onClosePoll,
  onRetryFailed,
}: {
  message: ChatMessage;
  memberPortal: boolean;
  canManageGroups: boolean;
  showSenderMeta: boolean;
  clusteredWithPrevious: boolean;
  onVote: (pollId: string, optionId: string) => void;
  onClosePoll: (pollId: string) => void;
  onRetryFailed?: (message: ChatMessage) => void;
}) {
  const { theme } = useTheme();
  const mine = message.mine;
  const poll = message.poll;
  const isPoll = message.messageType === 'POLL' || Boolean(message.pollId);
  const isImage =
    message.messageType === 'IMAGE' || Boolean(message.attachmentUrl || message.localPreviewUri);
  const showResults = Boolean(
    poll && (poll.showResults || poll.status === 'CLOSED' || (canManageGroups && !memberPortal))
  );
  const failed = message.localStatus === 'failed';
  const rowStyle = [
    styles.bubbleRow,
    clusteredWithPrevious ? styles.bubbleRowClustered : null,
    mine ? styles.bubbleRowMine : styles.bubbleRowOther,
  ];

  const timeRow = (
    <View style={styles.bubbleMetaRow}>
      <Text style={[styles.bubbleTime, { color: mine ? 'rgba(255,255,255,0.75)' : theme.textMuted }]}>
        {formatBubbleTime(message.sentAt)}
      </Text>
      {mine ? <DeliveryTicks message={message} /> : null}
    </View>
  );

  const wrapPressable = (node: ReactNode) =>
    failed && onRetryFailed ? (
      <Pressable onPress={() => onRetryFailed(message)} accessibilityLabel="Retry send">
        {node}
      </Pressable>
    ) : (
      <>{node}</>
    );

  if (isPoll && poll) {
    return (
      <View style={rowStyle}>
        <PollMessageBubble
          message={message}
          poll={poll}
          showResults={showResults}
          canManageGroups={canManageGroups}
          memberPortal={memberPortal}
          onVote={onVote}
          onClosePoll={onClosePoll}
        />
      </View>
    );
  }

  if (isImage && (message.attachmentUrl || message.localPreviewUri)) {
    const attachmentPath =
      message.attachmentUrl &&
      memberPortal &&
      message.attachmentUrl.startsWith('/society/')
        ? message.attachmentUrl.replace('/society/chat/', '/member/chat/')
        : message.attachmentUrl;

    return wrapPressable(
      <View style={rowStyle}>
        <View
          style={[
            styles.bubble,
            styles.imageBubble,
            failed ? styles.bubbleFailed : null,
            mine
              ? { backgroundColor: theme.accent, borderBottomRightRadius: 4 }
              : { backgroundColor: theme.chipBg, borderBottomLeftRadius: 4 },
          ]}
        >
          {showSenderMeta ? (
            <Text style={[styles.senderName, { color: theme.textMuted }]}>{message.senderName}</Text>
          ) : null}
          <AuthenticatedImage
            path={attachmentPath}
            localUri={message.localPreviewUri}
            style={styles.chatImage}
          />
          {message.body ? (
            <Text style={[styles.bubbleText, { color: mine ? '#fff' : theme.text, marginTop: 8 }]}>
              {message.body}
            </Text>
          ) : null}
          {timeRow}
          {failed ? (
            <Text style={styles.failedHint}>Tap to retry</Text>
          ) : null}
        </View>
      </View>
    );
  }

  return wrapPressable(
    <View style={rowStyle}>
      <View
        style={[
          styles.bubble,
          failed ? styles.bubbleFailed : null,
          mine
            ? { backgroundColor: theme.accent, borderBottomRightRadius: 4 }
            : { backgroundColor: theme.chipBg, borderBottomLeftRadius: 4 },
        ]}
      >
        {showSenderMeta ? (
          <Text style={[styles.senderName, { color: theme.textMuted }]}>{message.senderName}</Text>
        ) : null}
        <Text style={[styles.bubbleText, { color: mine ? '#fff' : theme.text }]}>{message.body}</Text>
        {timeRow}
        {failed ? <Text style={styles.failedHint}>Tap to retry</Text> : null}
      </View>
    </View>
  );
});

function ChatComposer({
  sending,
  onSend,
  onSendPhoto,
  onFocus,
  onTypingChange,
  canCreatePoll,
  onCreatePoll,
}: {
  sending: boolean;
  onSend: (text: string) => Promise<void>;
  onSendPhoto: (photo: PickedPhoto, caption: string) => Promise<void>;
  onFocus?: () => void;
  onTypingChange?: (text: string) => void;
  canCreatePoll?: boolean;
  onCreatePoll?: () => void;
}) {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<PickedPhoto | null>(null);

  const submit = async () => {
    const trimmed = text.trim();
    if (pendingPhoto) {
      const photo = pendingPhoto;
      setPendingPhoto(null);
      setText('');
      onTypingChange?.('');
      await onSendPhoto(photo, trimmed);
      return;
    }
    if (!trimmed) return;
    setText('');
    onTypingChange?.('');
    await onSend(trimmed);
  };

  const attachPhoto = () => {
    showPhotoSourcePicker(
      () => {
        void pickPhotoFromCamera().then((photo) => {
          if (photo) setPendingPhoto(photo);
        });
      },
      () => {
        void pickPhotoFromLibrary().then((photo) => {
          if (photo) setPendingPhoto(photo);
        });
      }
    );
  };

  const canSend = Boolean(text.trim() || pendingPhoto) && !(sending && pendingPhoto);

  return (
    <View style={[styles.composer, { backgroundColor: theme.cardBg, borderTopColor: theme.cardBorder }]}>
      {pendingPhoto ? (
        <View style={styles.composerPreviewRow}>
          <Image source={{ uri: pendingPhoto.uri }} style={styles.composerPreviewImage} />
          <Pressable onPress={() => setPendingPhoto(null)} hitSlop={8}>
            <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Remove</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.composerRow}>
        <Pressable
          style={[styles.attachBtn, { backgroundColor: theme.chipBg }]}
          onPress={attachPhoto}
          hitSlop={8}
          accessibilityLabel="Attach photo"
        >
          <Text style={styles.attachBtnIcon}>📷</Text>
        </Pressable>
        {canCreatePoll ? (
          <Pressable
            style={[styles.attachBtn, { backgroundColor: theme.chipBg }]}
            onPress={onCreatePoll}
            hitSlop={8}
            accessibilityLabel="Create poll"
          >
            <Text style={styles.attachBtnIcon}>📊</Text>
          </Pressable>
        ) : null}
        <TextInput
          style={[styles.composerInput, { color: theme.text, backgroundColor: theme.chipBg }]}
          placeholder={pendingPhoto ? 'Add a caption (optional)…' : 'Type a message…'}
          placeholderTextColor={theme.textMuted}
          value={text}
          onChangeText={(value) => {
            setText(value);
            onTypingChange?.(value);
          }}
          onFocus={onFocus}
          multiline
          maxLength={2000}
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: theme.accent, opacity: canSend ? 1 : 0.5 }]}
          onPress={submit}
          disabled={!canSend}
        >
          {sending && pendingPhoto ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendBtnText}>Send</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function GroupListScreen({
  memberPortal,
  societyId,
  userId,
  canManageGroups,
  onOpenGroup,
  onCreateGroup,
  refreshToken,
}: {
  memberPortal: boolean;
  societyId?: string | null;
  userId?: string;
  canManageGroups: boolean;
  onOpenGroup: (groupId: string) => void;
  onCreateGroup: () => void;
  refreshToken: number;
}) {
  const { theme } = useTheme();
  const [groups, setGroups] = useState<ChatGroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsConnectedRef = useRef(false);

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
  }, [load, refreshToken]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!wsConnectedRef.current) {
        void load(true);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!societyId) return;
    let active = true;
    void connectChatRealtime(societyId, {
      onConnectionChange: (connected) => {
        wsConnectedRef.current = connected;
        if (connected && active) {
          void load(true);
        }
      },
      onEvent: (event: ChatRealtimeEvent) => {
        if (!active) return;
        if (event.type === 'GROUP_UPDATED') {
          const g = event.group;
          setGroups((prev) => {
            const idx = prev.findIndex((row) => row.conversationId === g.conversationId);
            if (idx < 0) {
              void load(true);
              return prev;
            }
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              groupName: g.groupName ?? next[idx].groupName,
              lastMessagePreview:
                g.lastMessagePreview !== undefined
                  ? g.lastMessagePreview
                  : next[idx].lastMessagePreview,
              lastMessageAt:
                g.lastMessageAt !== undefined ? g.lastMessageAt : next[idx].lastMessageAt,
              unreadCount:
                g.unreadCount !== undefined ? Number(g.unreadCount) : next[idx].unreadCount,
              memberCount:
                g.memberCount !== undefined ? Number(g.memberCount) : next[idx].memberCount,
            };
            return next;
          });
          return;
        }
        if (event.type === 'NEW_MESSAGE') {
          const fromSelf = userId && String(event.message.senderUserId) === String(userId);
          setGroups((prev) => {
            const idx = prev.findIndex((row) => row.conversationId === event.groupId);
            if (idx < 0) {
              void load(true);
              return prev;
            }
            const next = [...prev];
            const current = next[idx];
            next[idx] = {
              ...current,
              groupName: event.groupName ?? current.groupName,
              lastMessagePreview:
                event.lastMessagePreview ??
                event.message.body ??
                current.lastMessagePreview,
              lastMessageAt: event.lastMessageAt ?? event.message.sentAt ?? current.lastMessageAt,
              unreadCount: fromSelf
                ? current.unreadCount
                : Number(current.unreadCount ?? 0) + 1,
            };
            return next;
          });
          return;
        }
        if (event.type === 'READ' && userId && String(event.userId) === String(userId)) {
          setGroups((prev) =>
            prev.map((row) =>
              row.conversationId === event.groupId ? { ...row, unreadCount: 0 } : row
            )
          );
        }
      },
    }).then((disconnect) => {
      if (!active) disconnect();
    });
    return () => {
      active = false;
      disconnectChatRealtime();
      wsConnectedRef.current = false;
    };
  }, [societyId, userId, load]);

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
        <Text style={[styles.threadTitle, { color: theme.text }]}>Group Chat</Text>
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
              <View style={styles.groupCardRight}>
                {item.lastMessageAt ? (
                  <Text style={[styles.groupTime, { color: theme.textMuted }]}>
                    {formatSmartChatTime(item.lastMessageAt)}
                  </Text>
                ) : null}
                {item.unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadBadgeLabel(item.unreadCount)}</Text>
                  </View>
                ) : null}
              </View>
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
  societyId,
  userId,
  groupId,
  canManageGroups,
  initialPollId,
  onInitialPollConsumed,
  onBack,
}: {
  memberPortal: boolean;
  societyId?: string | null;
  userId?: string;
  groupId: string;
  canManageGroups: boolean;
  initialPollId?: string | null;
  onInitialPollConsumed?: () => void;
  onBack: () => void;
}) {
  const { theme } = useTheme();
  const { alert } = useAppAlert();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendBanner, setSendBanner] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [openedUnreadCount, setOpenedUnreadCount] = useState(0);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
  const [nearBottom, setNearBottom] = useState(true);
  const [pendingNewCount, setPendingNewCount] = useState(0);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showPollCreate, setShowPollCreate] = useState(false);
  const [showEditMembers, setShowEditMembers] = useState(false);
  const [pollSaving, setPollSaving] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const listRef = useRef<FlatList<PresentationRow>>(null);
  const keyboardInset = useKeyboardInset();
  const scrollOffsetRef = useRef(0);
  const contentHeightRef = useRef(0);
  const openedUnreadCountRef = useRef(0);
  const nearBottomRef = useRef(true);
  const latestMessageIdRef = useRef<string | null>(null);
  const initialScrollDoneRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const wsConnectedRef = useRef(false);
  const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentRef = useRef(false);

  useEffect(() => {
    openedUnreadCountRef.current = openedUnreadCount;
  }, [openedUnreadCount]);

  useEffect(() => {
    nearBottomRef.current = nearBottom;
    if (nearBottom) {
      setPendingNewCount(0);
    }
  }, [nearBottom]);

  const clearActiveChatUnread = useCallback(async () => {
    try {
      await markGroupChatRead(memberPortal, groupId);
      setOpenedUnreadCount(0);
      setFirstUnreadMessageId(null);
    } catch {
      /* keep badge on failure */
    }
  }, [memberPortal, groupId]);

  useEffect(() => {
    loadingOlderRef.current = loadingOlder;
  }, [loadingOlder]);

  const loadOlderMessages = useCallback(
    async (onComplete?: () => void) => {
      if (!thread?.messages.length || loadingOlderRef.current || !hasMoreOlder) {
        onComplete?.();
        return;
      }

      const oldestPersisted = thread.messages.find((message) => isPersistedMessageId(message.id));
      if (!oldestPersisted) {
        onComplete?.();
        return;
      }
      const oldestId = String(oldestPersisted.id);
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
        const oldestPersisted = currentThread.messages.find((message) =>
          isPersistedMessageId(message.id)
        );
        if (!oldestPersisted) break;
        const oldestId = String(oldestPersisted.id);
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

  const ingestIncomingMessage = useCallback(
    (incoming: ChatMessage, opts?: { fromSelf?: boolean }) => {
      const fromSelf =
        opts?.fromSelf ??
        Boolean(incoming.mine || (userId && String(incoming.senderUserId) === String(userId)));
      const normalized: ChatMessage = {
        ...incoming,
        mine: fromSelf || Boolean(incoming.mine),
      };

      let didAppend = false;
      setThread((prev) => {
        if (!prev) return prev;
        const nextMessages = appendMessageIfNew(prev.messages, normalized);
        if (nextMessages === prev.messages) return prev;
        didAppend = nextMessages.length > prev.messages.length;
        return { ...prev, messages: nextMessages };
      });

      if (!fromSelf && didAppend) {
        if (!nearBottomRef.current) {
          setPendingNewCount((count) => count + 1);
        }
        let nextFirstUnread: string | null = null;
        setOpenedUnreadCount((count) => {
          if (count === 0) {
            nextFirstUnread = String(normalized.id);
          }
          return count + 1;
        });
        if (nextFirstUnread) {
          setFirstUnreadMessageId(nextFirstUnread);
        }
      }

      if (normalized.messageType === 'POLL' || normalized.pollId) {
        void hydratePollMessages([normalized], memberPortal).then((hydrated) => {
          const pollMessage = hydrated[0];
          if (!pollMessage?.poll) return;
          setThread((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.map((message) =>
                String(message.id) === String(pollMessage.id) ||
                (pollMessage.clientId && message.clientId === pollMessage.clientId)
                  ? { ...message, ...pollMessage }
                  : message
              ),
            };
          });
        });
      }
    },
    [memberPortal, userId]
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
          const hydrated = await hydratePollMessages(normalized.messages, memberPortal);
          const unread = Number(data.unreadCount ?? 0);
          setThread({ ...normalized, messages: hydrated });
          setHasMoreOlder(Boolean(data.hasMoreOlder));
          setOpenedUnreadCount(unread);
          setFirstUnreadMessageId(
            normalized.firstUnreadMessageId ?? resolveFirstUnreadMessageId(normalized)
          );
          setNearBottom(unread === 0);
          setPendingNewCount(0);
          initialScrollDoneRef.current = false;
          return;
        }

        const latestId = latestMessageIdRef.current;
        if (!latestId) return;

        const page = await fetchGroupChatThread(memberPortal, groupId, { after: latestId });
        const added = Array.isArray(page.messages) ? page.messages : [];
        if (added.length === 0) return;

        for (const message of added) {
          ingestIncomingMessage(message);
        }
      } catch (e: unknown) {
        if (!silent) {
          setError(e instanceof Error ? e.message : 'Could not load chat');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [memberPortal, groupId, ingestIncomingMessage]
  );

  useEffect(() => {
    setThread(null);
    setError(null);
    setSendBanner(null);
    setLoading(true);
    setOpenedUnreadCount(0);
    setFirstUnreadMessageId(null);
    setNearBottom(true);
    setPendingNewCount(0);
    setHasMoreOlder(false);
    setLoadingOlder(false);
    setTypingLabel(null);
    scrollOffsetRef.current = 0;
    contentHeightRef.current = 0;
    initialScrollDoneRef.current = false;
    load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!wsConnectedRef.current) {
        void load(true);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!societyId) return;
    let active = true;
    void connectChatRealtime(societyId, {
      onConnectionChange: (connected) => {
        wsConnectedRef.current = connected;
        if (connected && active) {
          void load(true);
        }
      },
      onEvent: (event: ChatRealtimeEvent) => {
        if (!active) return;
        if (event.type === 'NEW_MESSAGE' && event.groupId === groupId) {
          const fromSelf = Boolean(
            event.message.mine ||
              (userId && String(event.message.senderUserId) === String(userId))
          );
          ingestIncomingMessage(event.message, { fromSelf });
          return;
        }
        if (event.type === 'READ' && event.groupId === groupId) {
          if (userId && String(event.userId) === String(userId)) return;
          const readAt = new Date().toISOString();
          setThread((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.map((message) =>
                message.mine && !message.readAt ? { ...message, readAt } : message
              ),
            };
          });
          return;
        }
        if (event.type === 'TYPING' && event.groupId === groupId) {
          if (userId && String(event.userId) === String(userId)) return;
          if (typingClearTimerRef.current) {
            clearTimeout(typingClearTimerRef.current);
            typingClearTimerRef.current = null;
          }
          if (!event.typing) {
            setTypingLabel(null);
            return;
          }
          const name = event.userName?.trim() || 'Someone';
          setTypingLabel(`${name} is typing…`);
          typingClearTimerRef.current = setTimeout(() => {
            setTypingLabel(null);
            typingClearTimerRef.current = null;
          }, TYPING_CLEAR_MS);
        }
      },
    }).then((disconnect) => {
      if (!active) disconnect();
    });
    return () => {
      active = false;
      if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      if (typingSentRef.current && societyId) {
        publishChatTyping({ societyId, groupId, typing: false });
        typingSentRef.current = false;
      }
      disconnectChatRealtime();
      wsConnectedRef.current = false;
    };
  }, [societyId, groupId, userId, load, ingestIncomingMessage]);

  const scrollToEnd = useCallback((animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 50);
  }, []);

  const handleTypingChange = useCallback(
    (text: string) => {
      if (!societyId) return;
      const isTyping = text.trim().length > 0;
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
        typingDebounceRef.current = null;
      }
      if (isTyping) {
        if (!typingSentRef.current) {
          publishChatTyping({ societyId, groupId, typing: true });
          typingSentRef.current = true;
        }
        typingDebounceRef.current = setTimeout(() => {
          publishChatTyping({ societyId, groupId, typing: false });
          typingSentRef.current = false;
          typingDebounceRef.current = null;
        }, TYPING_DEBOUNCE_MS);
      } else if (typingSentRef.current) {
        publishChatTyping({ societyId, groupId, typing: false });
        typingSentRef.current = false;
      }
    },
    [societyId, groupId]
  );

  const updatePollInThread = useCallback((poll: PollDetail) => {
    setThread((prev) => {
      if (!prev) return prev;
      const pollId = String(poll.pollId);
      return {
        ...prev,
        messages: prev.messages.map((message) =>
          String(message.pollId ?? message.poll?.pollId ?? '') === pollId
            ? { ...message, poll, pollId: poll.pollId, messageType: 'POLL' as const }
            : message
        ),
      };
    });
  }, []);

  const handleVote = useCallback(
    async (pollId: string, optionId: string) => {
      try {
        const updated = await voteOnPoll(pollId, optionId);
        updatePollInThread(updated);
      } catch (err) {
        await alert('Could not vote', err instanceof Error ? err.message : 'Try again.');
      }
    },
    [updatePollInThread, alert]
  );

  const handleClosePoll = useCallback(
    async (pollId: string) => {
      try {
        const updated = await closePoll(pollId);
        updatePollInThread(updated);
      } catch (err) {
        await alert('Could not close poll', err instanceof Error ? err.message : 'Try again.');
      }
    },
    [updatePollInThread, alert]
  );

  const submitPollCreate = async (question: string, options: string[], expiresInMinutes: number) => {
    if (!question) {
      await alert('Missing question', 'Enter a poll question.');
      return;
    }
    if (options.length < 2) {
      await alert('Need options', 'Add at least two options.');
      return;
    }
    setPollSaving(true);
    try {
      const message = await createGroupChatPoll(groupId, question, options, expiresInMinutes);
      const pollMessage: ChatMessage = {
        ...message,
        mine: true,
        messageType: message.messageType ?? 'POLL',
      };
      setThread((prev) => {
        if (!prev) return prev;
        return { ...prev, messages: appendMessageIfNew(prev.messages, pollMessage) };
      });
      setShowPollCreate(false);
      scrollToEnd(true);
      await clearActiveChatUnread();
    } catch (err) {
      await alert('Could not create poll', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setPollSaving(false);
    }
  };

  const scrollToUnreadAnchor = useCallback(() => {
    const rows = buildPresentationRows(
      thread?.messages ?? [],
      firstUnreadMessageId,
      openedUnreadCount
    );
    const dividerIndex = rows.findIndex((row) => row.kind === 'unread');
    if (dividerIndex < 0) return;
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: dividerIndex, viewPosition: 0.42, animated: false });
      setNearBottom(false);
    }, 80);
  }, [thread?.messages, firstUnreadMessageId, openedUnreadCount]);

  useEffect(() => {
    const messages = thread?.messages ?? [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (
        isPersistedMessageId(message.id) &&
        message.localStatus !== 'sending' &&
        message.localStatus !== 'failed'
      ) {
        latestMessageIdRef.current = String(message.id);
        return;
      }
    }
    latestMessageIdRef.current = null;
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
    if (!initialPollId || !thread?.messages.length) return;
    const pollId = String(initialPollId);
    const rows = buildPresentationRows(thread.messages, firstUnreadMessageId, openedUnreadCount);
    const index = rows.findIndex(
      (row) =>
        row.kind === 'message' &&
        String(row.message.pollId ?? row.message.poll?.pollId ?? '') === pollId
    );
    onInitialPollConsumed?.();
    if (index < 0) return;
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
    }, 120);
  }, [initialPollId, thread?.messages, firstUnreadMessageId, openedUnreadCount, onInitialPollConsumed]);

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

  const replaceOptimistic = useCallback((clientId: string, serverMessage: ChatMessage) => {
    setThread((prev) => {
      if (!prev) return prev;
      const idx = prev.messages.findIndex((message) => message.clientId === clientId);
      if (idx < 0) {
        return { ...prev, messages: appendMessageIfNew(prev.messages, serverMessage) };
      }
      const next = [...prev.messages];
      next[idx] = { ...serverMessage, clientId, localStatus: undefined, mine: true };
      return { ...prev, messages: next };
    });
  }, []);

  const markOptimisticFailed = useCallback((clientId: string) => {
    setThread((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: prev.messages.map((message) =>
          message.clientId === clientId ? { ...message, localStatus: 'failed' as const } : message
        ),
      };
    });
  }, []);

  const handleSend = async (body: string) => {
    const clientId = createLocalClientId();
    const optimistic: ChatMessage = {
      id: clientId,
      clientId,
      body,
      sentAt: new Date().toISOString(),
      readAt: null,
      senderUserId: userId ?? 'me',
      senderName: 'You',
      senderRole: '',
      mine: true,
      localStatus: 'sending',
      messageType: 'TEXT',
    };
    setSendBanner(null);
    setThread((prev) => {
      if (!prev) return prev;
      return { ...prev, messages: [...prev.messages, optimistic] };
    });
    setNearBottom(true);
    scrollToEnd();
    void clearActiveChatUnread();
    try {
      const message = await sendGroupChatMessage(memberPortal, groupId, body);
      replaceOptimistic(clientId, { ...message, mine: true });
    } catch (e: unknown) {
      markOptimisticFailed(clientId);
      setSendBanner(e instanceof Error ? e.message : 'Send failed');
    }
  };

  const handleSendPhoto = async (photo: PickedPhoto, caption: string) => {
    const clientId = createLocalClientId();
    const optimistic: ChatMessage = {
      id: clientId,
      clientId,
      body: caption,
      sentAt: new Date().toISOString(),
      readAt: null,
      senderUserId: userId ?? 'me',
      senderName: 'You',
      senderRole: '',
      mine: true,
      localStatus: 'sending',
      messageType: 'IMAGE',
      localPreviewUri: photo.uri,
    };
    setSendBanner(null);
    setSending(true);
    setThread((prev) => {
      if (!prev) return prev;
      return { ...prev, messages: [...prev.messages, optimistic] };
    });
    setNearBottom(true);
    scrollToEnd();
    void clearActiveChatUnread();
    try {
      const message = await sendGroupChatMessageWithPhoto(
        memberPortal,
        groupId,
        caption,
        photo.uri,
        photo.fileName,
        photo.mimeType
      );
      replaceOptimistic(clientId, {
        ...message,
        mine: true,
        messageType: 'IMAGE',
        localPreviewUri: photo.uri,
      });
    } catch (e: unknown) {
      markOptimisticFailed(clientId);
      setSendBanner(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const handleRetryFailed = useCallback(
    (message: ChatMessage) => {
      if (message.localStatus !== 'failed' || !message.clientId) return;
      const clientId = message.clientId;
      const body = message.body ?? '';
      const isImage = message.messageType === 'IMAGE' || Boolean(message.localPreviewUri);

      setThread((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((row) =>
            row.clientId === clientId ? { ...row, localStatus: 'sending' as const } : row
          ),
        };
      });
      setSendBanner(null);

      void (async () => {
        try {
          if (isImage && message.localPreviewUri) {
            const sent = await sendGroupChatMessageWithPhoto(
              memberPortal,
              groupId,
              body,
              message.localPreviewUri,
              'photo.jpg',
              'image/jpeg'
            );
            replaceOptimistic(clientId, {
              ...sent,
              mine: true,
              messageType: 'IMAGE',
              localPreviewUri: message.localPreviewUri,
            });
          } else {
            const sent = await sendGroupChatMessage(memberPortal, groupId, body);
            replaceOptimistic(clientId, { ...sent, mine: true });
          }
        } catch (e: unknown) {
          markOptimisticFailed(clientId);
          setSendBanner(e instanceof Error ? e.message : 'Send failed');
        }
      })();
    },
    [memberPortal, groupId, replaceOptimistic, markOptimisticFailed]
  );

  const handleBack = async () => {
    await clearActiveChatUnread();
    onBack();
  };

  const rows = useMemo(
    () => buildPresentationRows(thread?.messages ?? [], firstUnreadMessageId, openedUnreadCount),
    [thread?.messages, firstUnreadMessageId, openedUnreadCount]
  );
  const groupTitle = thread?.groupName ?? 'Chat Group';

  const renderThreadRow = useCallback(
    ({ item }: { item: PresentationRow }) => {
      if (item.kind === 'date') {
        return <DateChip label={item.label} />;
      }
      if (item.kind === 'unread') {
        return <UnreadDivider count={item.count} />;
      }
      return (
        <MessageBubble
          message={item.message}
          memberPortal={memberPortal}
          canManageGroups={canManageGroups}
          showSenderMeta={item.showSenderMeta}
          clusteredWithPrevious={item.clusteredWithPrevious}
          onVote={handleVote}
          onClosePoll={handleClosePoll}
          onRetryFailed={handleRetryFailed}
        />
      );
    },
    [memberPortal, canManageGroups, handleVote, handleClosePoll, handleRetryFailed]
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
        <Pressable onPress={handleBack} style={styles.threadBackBtn} hitSlop={8}>
          <Text style={[styles.threadBackText, { color: theme.accent }]}>← Groups</Text>
        </Pressable>
        <View style={styles.threadHeaderCenter}>
          <Text style={[styles.threadTitle, { color: theme.text }]} numberOfLines={1}>
            {groupTitle}
          </Text>
          <Text style={[styles.threadSub, { color: theme.textMuted }]} numberOfLines={1}>
            {typingLabel ?? `${thread?.memberCount ?? 0} members`}
          </Text>
        </View>
        {canManageGroups && !memberPortal ? (
          <Pressable
            style={[styles.threadAddBtn, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
            onPress={() => setShowEditMembers(true)}
            hitSlop={8}
            accessibilityLabel="Add members"
          >
            <Text style={[styles.threadAddBtnIcon, { color: theme.accent }]}>+</Text>
          </Pressable>
        ) : (
          <View style={styles.threadAddBtnSpacer} />
        )}
      </View>
      {sendBanner ? (
        <Pressable
          style={styles.sendErrorBanner}
          onPress={() => setSendBanner(null)}
          accessibilityLabel="Dismiss send error"
        >
          <Text style={styles.sendErrorBannerText}>{sendBanner}</Text>
        </Pressable>
      ) : null}
      <CreatePollModal
        visible={showPollCreate}
        saving={pollSaving}
        onClose={() => setShowPollCreate(false)}
        onSubmit={(question, options, expiresInMinutes) =>
          void submitPollCreate(question, options, expiresInMinutes)
        }
      />
      <EditGroupMembersModal
        visible={showEditMembers}
        groupId={groupId}
        groupName={groupTitle}
        onClose={() => setShowEditMembers(false)}
        onSaved={(memberCount) => {
          setThread((prev) => (prev ? { ...prev, memberCount } : prev));
        }}
      />
      <View style={styles.messageArea}>
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
              <Text style={[styles.historyLoading, { color: theme.textMuted }]}>
                Loading older messages…
              </Text>
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
        {pendingNewCount > 0 ? (
          <Pressable
            style={[styles.newMessagesBadge, { backgroundColor: theme.accent }]}
            onPress={() => {
              setPendingNewCount(0);
              setNearBottom(true);
              scrollToEnd(true);
              void clearActiveChatUnread();
            }}
          >
            <Text style={styles.newMessagesBadgeText}>
              {pendingNewCount} new message{pendingNewCount === 1 ? '' : 's'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <ChatComposer
        sending={sending}
        onSend={handleSend}
        onSendPhoto={handleSendPhoto}
        onTypingChange={handleTypingChange}
        onFocus={() => {
          if (nearBottom) scrollToEnd();
        }}
        canCreatePoll={canManageGroups && !memberPortal}
        onCreatePoll={() => setShowPollCreate(true)}
      />
    </View>
  );
}

export function ChatModule({
  memberPortal = false,
  societyId,
  userId,
  canManageGroups = false,
  initialGroupId,
  initialPollId,
  onInitialGroupConsumed,
  onInitialPollConsumed,
}: {
  memberPortal?: boolean;
  societyId?: string | null;
  userId?: string;
  canManageGroups?: boolean;
  initialGroupId?: string | null;
  initialPollId?: string | null;
  onInitialGroupConsumed?: () => void;
  onInitialPollConsumed?: () => void;
}): ReactNode {
  const [screen, setScreen] = useState<Screen>(initialGroupId ? 'chat' : 'list');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(initialGroupId ?? null);
  const [listRefreshToken, setListRefreshToken] = useState(0);

  useHardwareBack(
    useCallback(() => {
      if (screen === 'create') {
        setScreen('list');
        return true;
      }
      if (screen === 'chat') {
        setListRefreshToken((token) => token + 1);
        setScreen('list');
        setActiveGroupId(null);
        return true;
      }
      return false;
    }, [screen]),
    screen !== 'list'
  );

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
        societyId={societyId}
        userId={userId}
        groupId={activeGroupId}
        canManageGroups={canManageGroups}
        initialPollId={initialPollId}
        onInitialPollConsumed={onInitialPollConsumed}
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
      societyId={societyId}
      userId={userId}
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
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  threadBackBtn: { flexShrink: 0 },
  threadBackText: { fontSize: 14, fontWeight: '700' },
  threadHeaderCenter: { flex: 1, minWidth: 0, gap: 1 },
  threadTitle: { fontSize: 16, fontWeight: '800', lineHeight: 20 },
  threadSub: { fontSize: 12, lineHeight: 16 },
  threadAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  threadAddBtnIcon: { fontSize: 22, fontWeight: '700', lineHeight: 24, marginTop: -1 },
  threadAddBtnSpacer: { width: 34, height: 34, flexShrink: 0 },
  createBtn: { marginTop: 12, alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  createBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  groupList: { padding: 12, gap: 10, flexGrow: 1 },
  groupCard: { borderWidth: 1, borderRadius: 12, padding: 14 },
  groupCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  groupCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  groupName: { fontSize: 16, fontWeight: '700', flex: 1 },
  groupMeta: { fontSize: 13, marginTop: 4 },
  groupTime: { fontSize: 11, fontWeight: '600' },
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
  dateChipWrap: { alignItems: 'center', marginVertical: 8 },
  dateChipText: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
  sendErrorBanner: {
    backgroundColor: '#fdecea',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f5c6cb',
  },
  sendErrorBannerText: { color: '#c0392b', fontSize: 13, fontWeight: '600' },
  messageArea: { flex: 1 },
  messageScroll: { flex: 1 },
  messageList: { padding: 12, paddingBottom: 8, flexGrow: 1 },
  bubbleRow: { marginBottom: 10, flexDirection: 'row' },
  bubbleRowClustered: { marginBottom: 3, marginTop: -4 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleFailed: { opacity: 0.85, borderWidth: 1, borderColor: '#e74c3c' },
  senderName: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  attachBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtnIcon: { fontSize: 20 },
  bubbleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  bubbleTime: { fontSize: 10, alignSelf: 'flex-end' },
  deliveryTick: { fontSize: 11, fontWeight: '700' },
  deliveryTickFailed: { color: '#ffdddd', fontWeight: '900' },
  failedHint: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    alignSelf: 'flex-end',
  },
  imageBubble: { maxWidth: '88%' },
  chatImage: { width: 220, height: 220, borderRadius: 12 },
  composer: { padding: 10, borderTopWidth: 1, gap: 8 },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  composerPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 4,
  },
  composerPreviewImage: { width: 64, height: 64, borderRadius: 10 },
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
  newMessagesBadge: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    elevation: 3,
  },
  newMessagesBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
