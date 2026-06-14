import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardEvent,
} from 'react-native';
import {
  createComplaint,
  fetchComplaintDetail,
  fetchComplaints,
  updateComplaint,
} from '../../services/api';
import type { ComplaintDetail, ComplaintSummary } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { ListEmpty, ListError } from '../../components/dashboard/ListStates';
import { useAppAlert } from '../../context/AppAlertContext';

type Screen = 'list' | 'create' | 'detail';

const CATEGORIES = [
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'PARKING', label: 'Parking' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'OTHER', label: 'Other' },
] as const;

const STATUSES = [
  { value: 'OPEN', label: 'Open' },
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
  return status.replace(/_/g, ' ');
}

function categoryLabel(category: string): string {
  return CATEGORIES.find((c) => c.value === category)?.label ?? category;
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

  const formScrollRef = useRef<ScrollView>(null);
  const descriptionFieldRef = useRef<View>(null);
  const chairmanNoteFieldRef = useRef<View>(null);
  const scrollOffsetRef = useRef(0);
  const descriptionFocusedRef = useRef(false);
  const chairmanNoteFocusedRef = useRef(false);
  const keyboardHeight = useKeyboardHeight();

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
        setScreen('detail');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load complaint');
      } finally {
        setLoading(false);
      }
    },
    [memberPortal]
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
      });
      setSubject('');
      setDescription('');
      setCategory('OTHER');
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
    setSaving(true);
    try {
      const updated = await updateComplaint(activeComplaint.complaintId, {
        status,
        chairmanNote: chairmanNote.trim(),
      });
      setActiveComplaint(updated);
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
              {activeComplaint.memberName} · Flat {activeComplaint.flatNumber}
            </Text>
          ) : null}
          <View style={[styles.detailBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Description</Text>
            <Text style={{ color: theme.text, lineHeight: 22 }}>{activeComplaint.description}</Text>
          </View>
          {activeComplaint.chairmanNote ? (
            <View style={[styles.detailBox, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
              <Text style={[styles.label, { color: theme.accent }]}>Chairman response</Text>
              <Text style={{ color: theme.text, lineHeight: 22 }}>{activeComplaint.chairmanNote}</Text>
            </View>
          ) : null}
          {canManageComplaints ? (
            <>
              <Text style={[styles.label, { color: theme.textMuted }]}>Status</Text>
              <View style={styles.chipRow}>
                {STATUSES.map((item) => (
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
        <Pressable style={[styles.createBar, { backgroundColor: theme.cardBg }]} onPress={() => setScreen('create')}>
          <Text style={[styles.createBarText, { color: theme.accent }]}>+ New Complaint</Text>
        </Pressable>
      ) : null}
      <FlatList
        data={complaints}
        keyExtractor={(item) => item.complaintId}
        contentContainerStyle={styles.listPad}
        ListEmptyComponent={
          <ListEmpty
            message={
              memberPortal
                ? 'No complaints yet. Tap above to report an issue.'
                : 'No member complaints yet.'
            }
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
            onPress={() => void openComplaint(item.complaintId)}
          >
            <Text style={[styles.cardSubject, { color: theme.text }]}>{item.subject}</Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {categoryLabel(item.category)} · {statusLabel(item.status)}
              {item.createdAt ? ` · ${formatWhen(item.createdAt)}` : ''}
            </Text>
            {item.memberName ? (
              <Text style={[styles.badge, { color: theme.accent }]}>
                {item.memberName} · {item.flatNumber}
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
  meta: { fontSize: 13, marginBottom: 8 },
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
  createBar: { padding: 14, alignItems: 'center' },
  createBarText: { fontWeight: '800' },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardSubject: { fontSize: 16, fontWeight: '700' },
  badge: { marginTop: 6, fontSize: 12, fontWeight: '700' },
  detailBox: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
});
