import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { ListEmpty, ListError } from '../../components/dashboard/ListStates';
import { RecordFiles } from '../../components/records/RecordFiles';
import {
  cancelMeeting,
  completeMeeting,
  createMeeting,
  fetchMeeting,
  fetchMeetings,
  meetingFilePath,
  updateMeeting,
  uploadMeetingFile,
  type MeetingDetail,
  type MeetingInput,
  type MeetingSummary,
  type Portal,
} from '../../services/records';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { apiErrorMessage } from '../../utils/apiError';

type Screen = { name: 'list' } | { name: 'detail'; id: string } | { name: 'form'; meeting?: MeetingDetail };

const STATUS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: 'Scheduled', color: '#047857' },
  CANCELLED: { label: 'Cancelled', color: '#b91c1c' },
  COMPLETED: { label: 'Held', color: '#475569' },
};

export function formatMeetingWhen(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Society meetings: the office schedules and manages them; members view them. */
export function MeetingsModule({
  memberPortal = false,
  initialMeetingId,
  onInitialMeetingConsumed,
}: {
  memberPortal?: boolean;
  initialMeetingId?: string | null;
  onInitialMeetingConsumed?: () => void;
}) {
  const portal: Portal = memberPortal ? 'member' : 'society';
  const [screen, setScreen] = useState<Screen>({ name: 'list' });

  useEffect(() => {
    if (initialMeetingId) {
      setScreen({ name: 'detail', id: initialMeetingId });
      onInitialMeetingConsumed?.();
    }
  }, [initialMeetingId, onInitialMeetingConsumed]);

  if (screen.name === 'detail') {
    return (
      <MeetingDetailScreen
        portal={portal}
        id={screen.id}
        onBack={() => setScreen({ name: 'list' })}
        onEdit={(m) => setScreen({ name: 'form', meeting: m })}
      />
    );
  }
  if (screen.name === 'form') {
    return (
      <MeetingForm
        meeting={screen.meeting}
        onDone={(id) => setScreen(id ? { name: 'detail', id } : { name: 'list' })}
      />
    );
  }
  return <MeetingList portal={portal} onOpen={(id) => setScreen({ name: 'detail', id })} onCreate={() => setScreen({ name: 'form' })} />;
}

function MeetingList({ portal, onOpen, onCreate }: { portal: Portal; onOpen: (id: string) => void; onCreate: () => void }) {
  const { theme } = useTheme();
  const [items, setItems] = useState<MeetingSummary[] | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const page = await fetchMeetings(portal);
      setItems(page.items);
      setCanManage(!!page.canManage && portal === 'society');
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load meetings'));
    }
  }, [portal]);

  useEffect(() => {
    void load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (items ?? []).filter((m) => m.status === 'SCHEDULED' && m.meetingDate >= today);
  const past = (items ?? []).filter((m) => !(m.status === 'SCHEDULED' && m.meetingDate >= today));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.pageBg }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.text }]}>Meetings</Text>
        {canManage ? (
          <Pressable onPress={onCreate} style={({ pressed }) => [styles.addBtn, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addText}>Schedule</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <ListError message={error} onRetry={() => void load()} /> : null}
      {items === null && !error ? <ActivityIndicator color={theme.accent} /> : null}
      {items !== null && items.length === 0 ? <ListEmpty message="No meetings yet." /> : null}
      {upcoming.length ? <Text style={[styles.section, { color: theme.textMuted }]}>UPCOMING</Text> : null}
      {upcoming.map((m) => <MeetingRow key={m.id} meeting={m} onPress={() => onOpen(m.id)} />)}
      {past.length ? <Text style={[styles.section, { color: theme.textMuted }]}>PAST AND CANCELLED</Text> : null}
      {past.map((m) => <MeetingRow key={m.id} meeting={m} onPress={() => onOpen(m.id)} />)}
    </ScrollView>
  );
}

function MeetingRow({ meeting, onPress }: { meeting: MeetingSummary; onPress: () => void }) {
  const { theme } = useTheme();
  const status = STATUS[meeting.status] ?? STATUS.SCHEDULED;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, opacity: pressed ? 0.9 : 1 }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>{meeting.title}</Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>{formatMeetingWhen(meeting.meetingDate, meeting.meetingTime)}</Text>
        <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>{meeting.location ?? 'Online meeting'}</Text>
      </View>
      <Text style={[styles.badge, { color: status.color, borderColor: status.color }]}>{status.label}</Text>
    </Pressable>
  );
}

function MeetingDetailScreen({ portal, id, onBack, onEdit }: { portal: Portal; id: string; onBack: () => void; onEdit: (m: MeetingDetail) => void }) {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setMeeting(await fetchMeeting(portal, id));
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load the meeting'));
    }
  }, [portal, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function attach() {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    setBusy(true);
    try {
      await uploadMeetingFile(id, { uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
      await load();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not attach the file'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function act(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await action();
      toast(done, 'success');
      await load();
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ListError message={error} onRetry={() => void load()} />;
  if (!meeting) {
    return <View style={[styles.center, { backgroundColor: theme.pageBg }]}><ActivityIndicator color={theme.accent} /></View>;
  }
  const status = STATUS[meeting.status] ?? STATUS.SCHEDULED;
  const manage = portal === 'society' && meeting.canManage && meeting.status === 'SCHEDULED';
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.pageBg }} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.back}>
        <Ionicons name="arrow-back" size={18} color={theme.accentGold} />
        <Text style={{ color: theme.accentGold, fontWeight: '700' }}>All meetings</Text>
      </Pressable>
      <SectionCard title={meeting.title} subtitle={formatMeetingWhen(meeting.meetingDate, meeting.meetingTime)}>
        <Text style={[styles.badge, styles.badgeInline, { color: status.color, borderColor: status.color }]}>{status.label}</Text>
        {meeting.location ? <Text style={[styles.body, { color: theme.text }]}>Venue: {meeting.location}</Text> : null}
        {meeting.onlineLink ? (
          <Pressable onPress={() => void Linking.openURL(meeting.onlineLink!)}>
            <Text style={[styles.body, { color: theme.accent, fontWeight: '700' }]}>Join online: {meeting.onlineLink}</Text>
          </Pressable>
        ) : null}
        {meeting.cancelReason ? <Text style={[styles.body, { color: '#b91c1c' }]}>Cancelled: {meeting.cancelReason}</Text> : null}
        {meeting.createdByName ? <Text style={[styles.meta, { color: theme.textMuted }]}>Called by {meeting.createdByName}</Text> : null}
      </SectionCard>
      <SectionCard title="Agenda">
        <Text style={[styles.body, { color: theme.text }]}>{meeting.agenda}</Text>
        {meeting.description ? <Text style={[styles.body, { color: theme.textMuted, marginTop: 8 }]}>{meeting.description}</Text> : null}
      </SectionCard>
      {meeting.files.length || manage ? (
        <SectionCard title="Documents">
          <RecordFiles files={meeting.files} pathFor={(fileId) => meetingFilePath(portal, meeting.id, fileId)} />
          {manage ? (
            <Pressable disabled={busy} onPress={() => void attach()} style={[styles.secondary, { borderColor: theme.accent, marginTop: 10 }]}>
              <Text style={{ color: theme.accent, fontWeight: '800' }}>{busy ? 'Uploading…' : 'Attach PDF or photo'}</Text>
            </Pressable>
          ) : null}
        </SectionCard>
      ) : null}
      {meeting.tharavs.length ? (
        <SectionCard title="Resolutions (Tharav)" subtitle="Passed in this meeting">
          {meeting.tharavs.map((t) => (
            <Text key={t.id} style={[styles.body, { color: theme.text }]}>
              {t.tharavNumber ? `No. ${t.tharavNumber} · ` : 'Draft · '}
              {t.title}
            </Text>
          ))}
        </SectionCard>
      ) : null}
      {manage ? (
        <SectionCard title="Manage">
          <Pressable onPress={() => onEdit(meeting)} style={[styles.secondary, { borderColor: theme.accent }]}>
            <Text style={{ color: theme.accent, fontWeight: '800' }}>Edit or reschedule</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => void act(() => completeMeeting(meeting.id), 'Marked as held')}
            style={[styles.secondary, { borderColor: theme.cardBorder, marginTop: 8 }]}
          >
            <Text style={{ color: theme.text, fontWeight: '700' }}>Mark as held</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() =>
              confirm({
                title: 'Cancel meeting?',
                message: 'All members will be notified that the meeting is cancelled.',
                confirmText: 'Cancel meeting',
                destructive: true,
                onConfirm: () => act(() => cancelMeeting(meeting.id), 'Meeting cancelled'),
              })
            }
            style={[styles.secondary, { borderColor: '#b91c1c', marginTop: 8 }]}
          >
            <Text style={{ color: '#b91c1c', fontWeight: '800' }}>Cancel meeting</Text>
          </Pressable>
        </SectionCard>
      ) : null}
    </ScrollView>
  );
}

function MeetingForm({ meeting, onDone }: { meeting?: MeetingDetail; onDone: (id?: string) => void }) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState<MeetingInput>({
    title: meeting?.title ?? '',
    meetingDate: meeting?.meetingDate ?? tomorrow,
    meetingTime: meeting?.meetingTime?.slice(0, 5) ?? '19:00',
    location: meeting?.location ?? '',
    onlineLink: meeting?.onlineLink ?? '',
    agenda: meeting?.agenda ?? '',
    description: meeting?.description ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (key: keyof MeetingInput) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const input = [styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }];

  async function save() {
    setSaving(true);
    try {
      const saved = meeting ? await updateMeeting(meeting.id, form) : await createMeeting(form);
      toast(meeting ? 'Meeting updated' : 'Meeting scheduled. Members have been notified.', 'success');
      onDone(saved.id);
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not save the meeting'), 'error');
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, key: keyof MeetingInput, extra: object = {}) => (
    <>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput style={input} value={form[key] ?? ''} onChangeText={set(key)} placeholderTextColor={theme.placeholder} {...extra} />
    </>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.pageBg }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SectionCard title={meeting ? 'Edit meeting' : 'Schedule a meeting'} subtitle="Members are notified when it is scheduled, rescheduled or cancelled">
        {field('Title', 'title', { placeholder: 'Annual general meeting' })}
        <View style={styles.two}>
          <View style={{ flex: 1 }}>{field('Date (YYYY-MM-DD)', 'meetingDate')}</View>
          <View style={{ flex: 1 }}>{field('Time (HH:MM, 24h)', 'meetingTime')}</View>
        </View>
        {field('Venue', 'location', { placeholder: 'Club house' })}
        {field('Online link (optional)', 'onlineLink', { placeholder: 'https://…', autoCapitalize: 'none' })}
        {field('Agenda', 'agenda', { multiline: true, style: [input, styles.area], placeholder: 'One item per line' })}
        {field('Description (optional)', 'description', { multiline: true, style: [input, styles.area] })}
        <Pressable disabled={saving} onPress={() => void save()} style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: saving ? 0.6 : pressed ? 0.9 : 1 }]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{meeting ? 'Save changes' : 'Schedule and notify members'}</Text>}
        </Pressable>
        <Pressable onPress={() => onDone(meeting?.id)} style={styles.cancel}>
          <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Cancel</Text>
        </Pressable>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 40, gap: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  addText: { color: '#fff', fontWeight: '800' },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginTop: 10, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },
  rowTitle: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 3 },
  badge: { fontSize: 11, fontWeight: '800', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeInline: { alignSelf: 'flex-start', marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 21, marginTop: 4 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  secondary: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 15 },
  area: { minHeight: 90, textAlignVertical: 'top' },
  two: { flexDirection: 'row', gap: 10 },
  primary: { marginTop: 16, borderRadius: 14, paddingVertical: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancel: { alignItems: 'center', paddingVertical: 12 },
});
