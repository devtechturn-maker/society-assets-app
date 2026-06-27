import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createNotice, fetchNoticeDetail, fetchNotices } from '../../services/api';
import type { NoticeDetail, NoticeSummary } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { ListEmpty } from '../../components/dashboard/ListStates';
import { useAppAlert } from '../../context/AppAlertContext';
import { useHardwareBack } from '../../hooks/useHardwareBack';

type Screen = 'list' | 'create' | 'detail';

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type Props = {
  memberPortal?: boolean;
  canManageNotices?: boolean;
  initialNoticeId?: string | null;
  onInitialNoticeConsumed?: () => void;
};

export function NoticeModule({
  memberPortal = false,
  canManageNotices = false,
  initialNoticeId,
  onInitialNoticeConsumed,
}: Props) {
  const { alert } = useAppAlert();
  const { theme } = useTheme();
  const [screen, setScreen] = useState<Screen>('list');
  const [notices, setNotices] = useState<NoticeSummary[]>([]);
  const [activeNotice, setActiveNotice] = useState<NoticeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  useHardwareBack(
    useCallback(() => {
      if (screen !== 'list') {
        setScreen('list');
        setActiveNotice(null);
        return true;
      }
      return false;
    }, [screen]),
    screen !== 'list'
  );

  const loadNotices = useCallback(async () => {
    try {
      const data = await fetchNotices(memberPortal);
      setNotices(data);
    } catch (e: unknown) {
      alert('Error', e instanceof Error ? e.message : 'Could not load notices', { variant: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [alert, memberPortal]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  useEffect(() => {
    if (!initialNoticeId) return;
    fetchNoticeDetail(memberPortal, initialNoticeId)
      .then((detail) => {
        setActiveNotice(detail);
        setScreen('detail');
      })
      .finally(() => onInitialNoticeConsumed?.());
  }, [initialNoticeId, memberPortal, onInitialNoticeConsumed]);

  async function openNotice(notice: NoticeSummary) {
    try {
      const detail = await fetchNoticeDetail(memberPortal, notice.noticeId);
      setActiveNotice(detail);
      setScreen('detail');
    } catch (e: unknown) {
      alert('Error', e instanceof Error ? e.message : 'Could not load notice', { variant: 'error' });
    }
  }

  async function submitCreate() {
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();
    if (!trimmedSubject || !trimmedDescription) {
      alert('Missing fields', 'Subject and description are required.', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const created = await createNotice({ subject: trimmedSubject, description: trimmedDescription });
      alert('Notice published', 'All society members were notified.', { variant: 'success' });
      setSubject('');
      setDescription('');
      setScreen('list');
      await loadNotices();
      setActiveNotice(created);
      setScreen('detail');
    } catch (e: unknown) {
      alert('Failed', e instanceof Error ? e.message : 'Could not publish notice', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (screen === 'create') {
    return (
      <ScrollView contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}>
        <Pressable onPress={() => setScreen('list')} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.accent }]}>← Back to notices</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Add Society Notice</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Members with the app will receive a notification with this subject and description.
        </Text>
        <Text style={[styles.label, { color: theme.text }]}>Subject</Text>
        <TextInput
          style={[styles.input, { borderColor: theme.divider, color: theme.text, backgroundColor: theme.cardBg }]}
          value={subject}
          onChangeText={setSubject}
          placeholder="e.g. Water supply maintenance"
          placeholderTextColor={theme.textSoft}
          maxLength={200}
        />
        <Text style={[styles.label, { color: theme.text }]}>Description</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            { borderColor: theme.divider, color: theme.text, backgroundColor: theme.cardBg },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="Full notice details for members"
          placeholderTextColor={theme.textSoft}
          multiline
          maxLength={2000}
        />
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: theme.accent }, saving ? styles.disabled : null]}
          disabled={saving}
          onPress={submitCreate}
        >
          <Text style={styles.primaryBtnText}>{saving ? 'Publishing…' : 'Publish Notice'}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (screen === 'detail' && activeNotice) {
    return (
      <ScrollView contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}>
        <Pressable onPress={() => setScreen('list')} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.accent }]}>← Back to notices</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{activeNotice.subject}</Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          {activeNotice.createdByName ? `Published by ${activeNotice.createdByName}` : ''}
          {activeNotice.createdAt ? ` · ${formatWhen(activeNotice.createdAt)}` : ''}
        </Text>
        <View style={[styles.detailBox, { borderColor: theme.divider, backgroundColor: theme.cardBg }]}>
          <Text style={[styles.detailLabel, { color: theme.text }]}>Description</Text>
          <Text style={[styles.detailBody, { color: theme.textSoft }]}>{activeNotice.description}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadNotices();
          }}
        />
      }
    >
      <View style={styles.headRow}>
        <View style={styles.headText}>
          <Text style={[styles.title, { color: theme.text }]}>Society Notices</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {canManageNotices
              ? 'Publish notices for your society. Members are notified automatically.'
              : 'Notices published by the chairman for your society.'}
          </Text>
        </View>
        {canManageNotices ? (
          <Pressable style={[styles.addBtn, { backgroundColor: theme.accent }]} onPress={() => setScreen('create')}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? <ActivityIndicator color={theme.accent} style={styles.loader} /> : null}
      {!loading && notices.length === 0 ? <ListEmpty message="No notices published yet." /> : null}
      {notices.map((notice) => (
        <Pressable
          key={notice.noticeId}
          style={[styles.card, { borderColor: theme.divider, backgroundColor: theme.cardBg }]}
          onPress={() => openNotice(notice)}
        >
          <Text style={[styles.cardTitle, { color: theme.text }]}>{notice.subject}</Text>
          <Text style={[styles.cardMeta, { color: theme.textSoft }]} numberOfLines={2}>
            {notice.description}
          </Text>
          <Text style={[styles.cardTime, { color: theme.textMuted }]}>{formatWhen(notice.createdAt)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 32 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  headText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  addBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  loader: { marginVertical: 24 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardMeta: { fontSize: 13, lineHeight: 18 },
  cardTime: { fontSize: 12, marginTop: 2 },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  primaryBtn: { marginTop: 20, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.6 },
  meta: { fontSize: 12, marginBottom: 12 },
  detailBox: { borderWidth: 1, borderRadius: 12, padding: 14 },
  detailLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  detailBody: { fontSize: 15, lineHeight: 22 },
});
