import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardEvent,
  RefreshControl,
} from 'react-native';
import {
  createComplaint,
  fetchComplaintAssignees,
  fetchComplaintDetail,
  fetchComplaints,
  updateComplaint,
  rateComplaint,
} from '../../services/api';
import type { ComplaintAssignees, ComplaintDetail, ComplaintHistoryEntry, ComplaintSummary } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { Badge } from '../../components/dashboard/Badge';
import { ListEmpty, ListError } from '../../components/dashboard/ListStates';
import { useAppAlert } from '../../context/AppAlertContext';
import { useHardwareBack } from '../../hooks/useHardwareBack';
import { AuthenticatedImage } from '../../components/chat/AuthenticatedImage';
import { UiIcon } from '../../components/UiIcon';
import {
  pickPhotoFromCamera,
  pickPhotoFromLibrary,
  showPhotoSourcePicker,
  type PickedPhoto,
} from '../../utils/pickPhoto';
import { unitName } from '../../utils/unitName';

type Screen = 'list' | 'create' | 'detail';

const CATEGORIES = [
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'PARKING', label: 'Parking' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'LIFT', label: 'Lift' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'WATER', label: 'Water' },
  { value: 'OTHER', label: 'Other' },
] as const;

const STATUSES = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
] as const;

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusLabel(status: string): string {
  return STATUSES.find((s) => s.value === status)?.label ?? status.replace(/_/g, ' ');
}

function categoryLabel(category: string): string {
  return CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

function statusBadgeTone(status: string): 'info' | 'warn' | 'neutral' | 'success' {
  switch (status) {
    case 'OPEN':
      return 'warn';
    case 'ASSIGNED':
    case 'IN_PROGRESS':
      return 'info';
    case 'RESOLVED':
      return 'success';
    default:
      return 'neutral';
  }
}

/** One line of the complaint timeline, e.g. "Status: Open → In progress". */
function historyText(entry: ComplaintHistoryEntry): string {
  switch (entry.action) {
    case 'CREATED':
      return 'Complaint raised';
    case 'STATUS':
      return `Status: ${statusLabel(entry.fromStatus ?? '')} → ${statusLabel(entry.toStatus ?? '')}`;
    case 'ASSIGNED':
      return `Assigned to ${entry.detail ?? 'nobody'}`;
    case 'DUE_DATE':
      return entry.detail && /^\d{4}-\d{2}-\d{2}$/.test(entry.detail) ? `Due date set to ${entry.detail}` : 'Due date removed';
    case 'NOTE':
      return 'Note added';
    case 'RATED':
      return `Rated ${entry.detail ?? ''}`;
    default:
      return entry.action;
  }
}

const DUE_DATE = /^\d{4}-\d{2}-\d{2}$/;

function currentAssignee(detail: ComplaintDetail): string {
  if (detail.assignedStaffId) return `staff:${detail.assignedStaffId}`;
  if (detail.assignedUserId) return `user:${detail.assignedUserId}`;
  return '';
}

const BOTTOM_TAB_BAR_HEIGHT = 62;
const KEYBOARD_FIELD_GAP = 16;

function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (event: KeyboardEvent) => setHeight(event.endCoordinates.height);
    const onHide = () => setHeight(0);
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}

function scrollFieldIntoView(
  scrollRef: RefObject<ScrollView | null>,
  fieldRef: RefObject<View | null>,
  scrollOffsetY: number,
  keyboardHeight: number,
) {
  const run = () => {
    const scroll = scrollRef.current;
    const field = fieldRef.current;
    if (!scroll || !field) return;

    scroll.measureInWindow((_scrollX, scrollY, _scrollW, scrollHeight) => {
      field.measureInWindow((_fieldX, fieldY, _fieldW, fieldHeight) => {
        const fieldBottom = fieldY + fieldHeight;
        const scrollBottom = scrollY + scrollHeight;
        const windowHeight = Dimensions.get('window').height;
        const keyboardBottom =
          keyboardHeight > 0 ? windowHeight - keyboardHeight - BOTTOM_TAB_BAR_HEIGHT : scrollBottom;
        const visibleBottom = keyboardHeight > 0 ? Math.min(scrollBottom, keyboardBottom) : scrollBottom;
        const overflow = fieldBottom - (visibleBottom - KEYBOARD_FIELD_GAP);

        if (overflow > 0) {
          scroll.scrollTo({ y: scrollOffsetY + overflow, animated: true });
        }
      });
    });
  };

  setTimeout(run, 50);
  setTimeout(run, 250);
}

export function ComplaintModule({
  memberPortal = false,
  canManageComplaints = false,
  initialComplaintId,
  onInitialComplaintConsumed,
}: {
  memberPortal?: boolean;
  canManageComplaints?: boolean;
  initialComplaintId?: string | null;
  onInitialComplaintConsumed?: () => void;
}) {
  const { theme } = useTheme();
  const { alert } = useAppAlert();
  const [screen, setScreen] = useState<Screen>('list');
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([]);
  const [activeComplaint, setActiveComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('OTHER');
  const [status, setStatus] = useState<string>('OPEN');
  const [chairmanNote, setChairmanNote] = useState('');
  const [assignees, setAssignees] = useState<ComplaintAssignees | null>(null);
  /** 'staff:<id>', 'user:<id>' or '' for nobody. */
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [stars, setStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);

  const formScrollRef = useRef<ScrollView>(null);
  const descriptionFieldRef = useRef<View>(null);
  const chairmanNoteFieldRef = useRef<View>(null);
  const scrollOffsetRef = useRef(0);
  const descriptionFocusedRef = useRef(false);
  const chairmanNoteFocusedRef = useRef(false);
  const keyboardHeight = useKeyboardHeight();

  useHardwareBack(
    useCallback(() => {
      if (screen !== 'list') {
        setScreen('list');
        setActiveComplaint(null);
        return true;
      }
      return false;
    }, [screen]),
    screen !== 'list'
  );

  const keyboardScrollPadding = Math.max(0, keyboardHeight - BOTTOM_TAB_BAR_HEIGHT);

  const scrollDescriptionIntoView = useCallback(() => {
    scrollFieldIntoView(
      formScrollRef,
      descriptionFieldRef,
      scrollOffsetRef.current,
      keyboardHeight
    );
  }, [keyboardHeight]);

  const scrollChairmanNoteIntoView = useCallback(() => {
    scrollFieldIntoView(
      formScrollRef,
      chairmanNoteFieldRef,
      scrollOffsetRef.current,
      keyboardHeight
    );
  }, [keyboardHeight]);

  useEffect(() => {
    if (keyboardHeight <= 0) return;
    if (descriptionFocusedRef.current) scrollDescriptionIntoView();
    if (chairmanNoteFocusedRef.current) scrollChairmanNoteIntoView();
  }, [keyboardHeight, scrollDescriptionIntoView, scrollChairmanNoteIntoView]);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchComplaints(memberPortal);
      setComplaints(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load complaints');
    } finally {
      setLoading(false);
    }
  }, [memberPortal]);

  const openComplaint = useCallback(
    async (complaintId: string) => {
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchComplaintDetail(memberPortal, complaintId);
        setActiveComplaint(detail);
        setStatus(detail.status);
        setChairmanNote(detail.chairmanNote ?? '');
        setAssignee(currentAssignee(detail));
        setDueDate(detail.dueDate ?? '');
        if (!memberPortal && canManageComplaints) {
          fetchComplaintAssignees()
            .then(setAssignees)
            .catch(() => setAssignees(null));
        }
        setScreen('detail');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load complaint');
      } finally {
        setLoading(false);
      }
    },
    [memberPortal, canManageComplaints]
  );

  useEffect(() => {
    void loadComplaints();
  }, [loadComplaints]);

  useEffect(() => {
    if (!initialComplaintId) return;
    void openComplaint(initialComplaintId);
    onInitialComplaintConsumed?.();
  }, [initialComplaintId, openComplaint, onInitialComplaintConsumed]);

  async function submitCreate() {
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();
    if (!trimmedSubject) {
      await alert('Missing subject', 'Enter a subject for your complaint.');
      return;
    }
    if (!trimmedDescription) {
      await alert('Missing description', 'Describe your complaint.');
      return;
    }
    setSaving(true);
    try {
      await createComplaint({
        subject: trimmedSubject,
        description: trimmedDescription,
        category,
        photos,
      });
      setSubject('');
      setDescription('');
      setCategory('OTHER');
      setPhotos([]);
      setScreen('list');
      await loadComplaints();
      await alert('Submitted', 'Your complaint was sent to the society chairman.');
    } catch (err) {
      await alert('Could not submit', err instanceof Error ? err.message : 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function submitUpdate() {
    if (!activeComplaint) return;
    const due = dueDate.trim();
    if (due && !DUE_DATE.test(due)) {
      await alert('Due date', 'Enter the due date like 2026-12-31, or leave it empty.');
      return;
    }
    const payload: Parameters<typeof updateComplaint>[1] = { status, chairmanNote: chairmanNote.trim() };
    if (assignee !== currentAssignee(activeComplaint)) {
      payload.assignedStaffId = assignee.startsWith('staff:') ? assignee.slice(6) : '';
      payload.assignedUserId = assignee.startsWith('user:') ? assignee.slice(5) : '';
    }
    if (due !== (activeComplaint.dueDate ?? '')) {
      payload.dueDate = due;
    }
    setSaving(true);
    try {
      const updated = await updateComplaint(activeComplaint.complaintId, payload);
      setActiveComplaint(updated);
      setStatus(updated.status);
      setAssignee(currentAssignee(updated));
      setDueDate(updated.dueDate ?? '');
      await loadComplaints();
      await alert('Updated', 'Complaint status saved. The member will be notified.');
    } catch (err) {
      await alert('Could not update', err instanceof Error ? err.message : 'Try again');
    } finally {
      setSaving(false);
    }
  }

  if (screen === 'create') {
    return (
      <ScrollView
        ref={formScrollRef}
        style={[styles.root, { backgroundColor: theme.pageBg }]}
        contentContainerStyle={[
          styles.pad,
          {
            backgroundColor: theme.pageBg,
            paddingBottom: 32 + keyboardScrollPadding,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator
        onScroll={(event) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.formContent}>
          <Pressable onPress={() => setScreen('list')}>
            <Text style={[styles.backLink, { color: theme.accent }]}>← Back</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>New Complaint</Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            Your chairman will receive a notification when you submit.
          </Text>
          <Text style={[styles.label, { color: theme.textMuted }]}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((item) => (
              <Pressable
                key={item.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: category === item.value ? theme.accentSoft : theme.chipBg,
                    borderColor: category === item.value ? theme.accent : theme.cardBorder,
                  },
                ]}
                onPress={() => setCategory(item.value)}
              >
                <Text style={{ color: category === item.value ? theme.accent : theme.text, fontWeight: '600' }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.label, { color: theme.textMuted }]}>Subject</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.cardBorder }]}
            value={subject}
            onChangeText={setSubject}
            placeholder="Brief summary"
            placeholderTextColor={theme.textMuted}
            maxLength={200}
          />
          <View ref={descriptionFieldRef} style={styles.fieldBlock}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Description</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.cardBorder },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the issue in detail"
              placeholderTextColor={theme.textMuted}
              multiline
              maxLength={2000}
              onFocus={() => {
                descriptionFocusedRef.current = true;
                scrollDescriptionIntoView();
              }}
              onBlur={() => {
                descriptionFocusedRef.current = false;
              }}
            />
          </View>
          <Text style={[styles.label, { color: theme.textMuted }]}>Photos (optional)</Text>
          <View style={styles.photoRow}>
            {photos.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={styles.photoThumbWrap}>
                <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                <Pressable style={styles.photoRemove} onPress={() => setPhotos((rows) => rows.filter((_, i) => i !== index))}>
                  <Text style={styles.photoRemoveText}>×</Text>
                </Pressable>
              </View>
            ))}
            {photos.length < 3 ? (
              <Pressable
                style={[styles.addPhotoBtn, { borderColor: theme.cardBorder, backgroundColor: theme.chipBg }]}
                onPress={() =>
                  showPhotoSourcePicker(
                    () => {
                      void pickPhotoFromCamera().then((photo) => {
                        if (photo) setPhotos((rows) => [...rows, photo].slice(0, 3));
                      });
                    },
                    () => {
                      void pickPhotoFromLibrary().then((photo) => {
                        if (photo) setPhotos((rows) => [...rows, photo].slice(0, 3));
                      });
                    }
                  )
                }
              >
                <Text style={{ color: theme.accent, fontWeight: '700' }}>+ Photo</Text>
              </Pressable>
            ) : null}
          </View>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: theme.accent, opacity: saving ? 0.6 : 1 }]}
            onPress={() => void submitCreate()}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Submit Complaint</Text>}
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  if (screen === 'detail' && activeComplaint) {
    return (
      <ScrollView
        ref={formScrollRef}
        style={[styles.root, { backgroundColor: theme.pageBg }]}
        contentContainerStyle={[
          styles.pad,
          {
            backgroundColor: theme.pageBg,
            paddingBottom: 32 + keyboardScrollPadding,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator
        onScroll={(event) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.formContent}>
          <Pressable onPress={() => setScreen('list')}>
            <Text style={[styles.backLink, { color: theme.accent }]}>← Back</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>{activeComplaint.subject}</Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            {categoryLabel(activeComplaint.category)} · {statusLabel(activeComplaint.status)}
            {activeComplaint.createdAt ? ` · ${formatWhen(activeComplaint.createdAt)}` : ''}
          </Text>
          {activeComplaint.memberName ? (
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {activeComplaint.memberName} · {unitName(activeComplaint.flatNumber)}
            </Text>
          ) : null}
          <View style={[styles.detailBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Description</Text>
            <Text style={{ color: theme.text, lineHeight: 22 }}>{activeComplaint.description}</Text>
          </View>
          {activeComplaint.attachments?.length ? (
            <View style={[styles.detailBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <Text style={[styles.label, { color: theme.textMuted }]}>Photos</Text>
              <View style={styles.photoRow}>
                {activeComplaint.attachments.map((attachment) => (
                  <AuthenticatedImage
                    key={attachment.index}
                    path={memberPortal ? attachment.memberUrl ?? attachment.url : attachment.url}
                    style={styles.photoThumb}
                  />
                ))}
              </View>
            </View>
          ) : null}
          {activeComplaint.assignedTo || activeComplaint.dueDate ? (
            <View style={[styles.detailBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              {activeComplaint.assignedTo ? (
                <Text style={{ color: theme.text }}>
                  Assigned to <Text style={{ fontWeight: '700' }}>{activeComplaint.assignedTo}</Text>
                </Text>
              ) : null}
              {activeComplaint.assignedStaffPhone ? (
                <Pressable onPress={() => void Linking.openURL(`tel:${activeComplaint.assignedStaffPhone}`)}>
                  <Text style={{ color: theme.accent, fontWeight: '700' }}>Call {activeComplaint.assignedStaffPhone}</Text>
                </Pressable>
              ) : null}
              {activeComplaint.dueDate ? (
                <Text style={{ color: activeComplaint.overdue ? '#b91c1c' : theme.textMuted, fontWeight: activeComplaint.overdue ? '700' : '400' }}>
                  Due {activeComplaint.dueDate}
                  {activeComplaint.overdue ? ' · Overdue' : ''}
                </Text>
              ) : null}
            </View>
          ) : null}
          {activeComplaint.chairmanNote ? (
            <View style={[styles.detailBox, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
              <Text style={[styles.label, { color: theme.accent }]}>Latest response</Text>
              <Text style={{ color: theme.text, lineHeight: 22 }}>{activeComplaint.chairmanNote}</Text>
            </View>
          ) : null}
          {activeComplaint.rating ? (
            <View style={[styles.detailBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <Text style={[styles.label, { color: theme.textMuted }]}>Resident rating</Text>
              <Text style={{ color: '#b45309', fontSize: 20 }}>
                {'★'.repeat(activeComplaint.rating)}
                <Text style={{ color: theme.divider }}>{'★'.repeat(5 - activeComplaint.rating)}</Text>
              </Text>
              {activeComplaint.ratingComment ? <Text style={{ color: theme.text }}>{activeComplaint.ratingComment}</Text> : null}
            </View>
          ) : null}
          {memberPortal && activeComplaint.canRate ? (
            <View style={[styles.detailBox, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}>
              <Text style={[styles.label, { color: theme.text }]}>How was it solved? Rate the society office</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => setStars(n)} hitSlop={6} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
                    <Text style={{ fontSize: 30, color: n <= stars ? '#b45309' : theme.divider }}>★</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: theme.pageBg, color: theme.text, borderColor: theme.cardBorder }]}
                value={ratingComment}
                onChangeText={setRatingComment}
                placeholder="Comment (optional)"
                placeholderTextColor={theme.textMuted}
                maxLength={500}
              />
              <Pressable
                disabled={stars < 1 || saving}
                style={[styles.primaryBtn, { backgroundColor: theme.accent, opacity: stars < 1 || saving ? 0.5 : 1 }]}
                onPress={async () => {
                  setSaving(true);
                  try {
                    const updated = await rateComplaint(activeComplaint.complaintId, stars, ratingComment.trim());
                    setActiveComplaint(updated);
                    setStars(0);
                    setRatingComment('');
                    await alert('Thank you', 'Your rating was sent to the society office.');
                  } catch (err) {
                    await alert('Could not rate', err instanceof Error ? err.message : 'Try again');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>Send rating</Text>
              </Pressable>
            </View>
          ) : null}
          {activeComplaint.history?.length ? (
            <View style={[styles.detailBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <Text style={[styles.label, { color: theme.textMuted }]}>History</Text>
              {activeComplaint.history.map((entry, index) => (
                <View key={`${entry.createdAt}-${index}`} style={styles.historyRow}>
                  <View style={[styles.historyDot, { backgroundColor: theme.accent }]} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: theme.text, fontWeight: '600' }}>{historyText(entry)}</Text>
                    {entry.note ? <Text style={{ color: theme.text, lineHeight: 20 }}>{entry.note}</Text> : null}
                    <Text style={[styles.meta, { color: theme.textMuted }]}>
                      {[entry.byName, formatWhen(entry.createdAt)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          {canManageComplaints && activeComplaint.status === 'CLOSED' ? (
            <Text style={[styles.meta, { color: theme.textMuted }]}>This complaint is closed and cannot be changed.</Text>
          ) : null}
          {canManageComplaints && activeComplaint.status !== 'CLOSED' ? (
            <>
              <Text style={[styles.label, { color: theme.textMuted }]}>Assign to</Text>
              <View style={styles.chipRow}>
                {[
                  { key: '', label: 'Nobody' },
                  ...(assignees?.staff ?? []).map((s) => ({
                    key: `staff:${s.id}`,
                    label: s.designation ? `${s.name} (${s.designation})` : s.name,
                  })),
                  ...(assignees?.committee ?? []).map((u) => ({ key: `user:${u.id}`, label: `${u.name} (committee)` })),
                ].map((option) => (
                  <Pressable
                    key={option.key || 'nobody'}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: assignee === option.key ? theme.accentSoft : theme.chipBg,
                        borderColor: assignee === option.key ? theme.accent : theme.cardBorder,
                      },
                    ]}
                    onPress={() => setAssignee(option.key)}
                  >
                    <Text style={{ color: assignee === option.key ? theme.accent : theme.text, fontWeight: '600' }}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                Staff are listed from your Staff page. Committee members get a notification.
              </Text>
              <Text style={[styles.label, { color: theme.textMuted }]}>Due date (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.cardBorder }]}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD, e.g. 2026-12-31"
                placeholderTextColor={theme.textMuted}
                maxLength={10}
                keyboardType="numbers-and-punctuation"
              />
              <Text style={[styles.label, { color: theme.textMuted }]}>Status</Text>
              <View style={styles.chipRow}>
                {STATUSES.filter(
                  (item) =>
                    item.value === activeComplaint.status ||
                    !activeComplaint.allowedStatuses ||
                    activeComplaint.allowedStatuses.includes(item.value)
                ).map((item) => (
                  <Pressable
                    key={item.value}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: status === item.value ? theme.accentSoft : theme.chipBg,
                        borderColor: status === item.value ? theme.accent : theme.cardBorder,
                      },
                    ]}
                    onPress={() => setStatus(item.value)}
                  >
                    <Text
                      style={{
                        color: status === item.value ? theme.accent : theme.text,
                        fontWeight: '600',
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View ref={chairmanNoteFieldRef} style={styles.fieldBlock}>
                <Text style={[styles.label, { color: theme.textMuted }]}>Note to member (optional)</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    { backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.cardBorder },
                  ]}
                  value={chairmanNote}
                  onChangeText={setChairmanNote}
                  placeholder="Response or action taken"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  maxLength={1000}
                  onFocus={() => {
                    chairmanNoteFocusedRef.current = true;
                    scrollChairmanNoteIntoView();
                  }}
                  onBlur={() => {
                    chairmanNoteFocusedRef.current = false;
                  }}
                />
              </View>
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: theme.accent, opacity: saving ? 0.6 : 1 }]}
                onPress={() => void submitUpdate()}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Update</Text>}
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
    );
  }

  if (loading && complaints.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.pageBg }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (error && complaints.length === 0) {
    return <ListError message={error} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.pageBg }]}>
      {memberPortal ? (
        <View style={styles.createBarWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.createBar,
              { backgroundColor: theme.accent, opacity: pressed ? 0.88 : 1 },
            ]}
            onPress={() => setScreen('create')}
          >
            <UiIcon name="plus" size={16} color="#fff" />
            <Text style={styles.createBarText}>New Complaint</Text>
          </Pressable>
        </View>
      ) : null}
      <FlatList
        data={complaints}
        keyExtractor={(item) => item.complaintId}
        refreshControl={<RefreshControl refreshing={loading && complaints.length > 0} onRefresh={() => void loadComplaints()} />}
        contentContainerStyle={styles.listPad}
        ListEmptyComponent={
          <ListEmpty
            icon="flag"
            title={memberPortal ? 'No complaints yet' : 'No member complaints yet'}
            subtitle={
              memberPortal
                ? 'Tap above to report an issue.'
                : undefined
            }
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
            onPress={() => void openComplaint(item.complaintId)}
          >
            <View style={styles.cardTop}>
              <Text style={[styles.cardSubject, { color: theme.text }]} numberOfLines={2}>
                {item.subject}
              </Text>
              <Badge label={statusLabel(item.status)} tone={statusBadgeTone(item.status)} />
            </View>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {categoryLabel(item.category)}
              {item.createdAt ? ` · ${formatWhen(item.createdAt)}` : ''}
            </Text>
            {item.memberName ? (
              <Text style={[styles.memberLine, { color: theme.accent }]}>
                {item.memberName} · {item.flatNumber}
              </Text>
            ) : null}
            {item.rating ? (
              <Text style={[styles.meta, { color: '#b45309' }]}>{'★'.repeat(item.rating)} rated</Text>
            ) : null}
            {item.assignedTo || item.dueDate ? (
              <Text style={[styles.meta, { color: item.overdue ? '#b91c1c' : theme.textMuted, fontWeight: item.overdue ? '700' : '400' }]}>
                {[item.assignedTo ? `To ${item.assignedTo}` : '', item.dueDate ? `Due ${item.dueDate}` : '', item.overdue ? 'Overdue' : '']
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: 16, gap: 12, paddingBottom: 32 },
  formContent: { gap: 12 },
  fieldBlock: { gap: 6 },
  listPad: { padding: 16, gap: 12, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backLink: { fontWeight: '700', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  meta: { fontSize: 13, marginBottom: 0 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  label: { fontSize: 13, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  primaryBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  createBarWrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  createBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  createBarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardSubject: { flex: 1, fontSize: 16, fontWeight: '700' },
  memberLine: { marginTop: 2, fontSize: 12, fontWeight: '700' },
  detailBox: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  historyRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  photoThumbWrap: { position: 'relative' },
  photoThumb: { width: 88, height: 88, borderRadius: 10 },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontWeight: '800', fontSize: 14, lineHeight: 16 },
  addPhotoBtn: {
    width: 88,
    height: 88,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
