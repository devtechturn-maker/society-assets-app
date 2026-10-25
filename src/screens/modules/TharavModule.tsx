import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '../../config/env';
import { getToken } from '../../services/storage';
import { unitName } from '../../utils/unitName';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { ListEmpty, ListError } from '../../components/dashboard/ListStates';
import { RecordFiles } from '../../components/records/RecordFiles';
import { SignaturePad } from '../../components/records/SignaturePad';
import { AuthenticatedImage } from '../../components/chat/AuthenticatedImage';
import {
  createTharav,
  deleteTharavDraft,
  fetchMeetings,
  fetchTharav,
  fetchTharavHistory,
  fetchTharavs,
  publishTharav,
  removeTharavFile,
  signTharav,
  tharavFilePath,
  tharavSignaturePath,
  updateTharav,
  uploadTharavFile,
  type HistoryEntry,
  type MeetingSummary,
  type Portal,
  type TharavDetail,
  type TharavInput,
  type TharavSummary,
} from '../../services/records';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { apiErrorMessage } from '../../utils/apiError';

type Screen =
  | { name: 'list' }
  | { name: 'detail'; id: string }
  | { name: 'form'; tharav?: TharavDetail; amend?: TharavDetail }
  | { name: 'sign'; tharav: TharavDetail }
  | { name: 'signed'; tharav: TharavDetail; signedAt: string };

const STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: '#b45309' },
  PUBLISHED: { label: 'Published', color: '#047857' },
  SUPERSEDED: { label: 'Superseded', color: '#475569' },
};
const MY_STATUS: Record<string, { label: string; color: string }> = {
  NOT_OPENED: { label: 'Not read', color: '#b45309' },
  OPENED: { label: 'Read, not signed', color: '#b45309' },
  SIGNED: { label: 'Signed', color: '#047857' },
};

function when(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function day(iso?: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
const titleOf = (t: { tharavNumber?: number | null; title: string }) => (t.tharavNumber ? `Tharav No. ${t.tharavNumber} · ${t.title}` : t.title);

/** Digital Tharav: office drafts, publishes and tracks signatures; members read and sign. */
export function TharavModule({
  memberPortal = false,
  initialTharavId,
  onInitialTharavConsumed,
}: {
  memberPortal?: boolean;
  initialTharavId?: string | null;
  onInitialTharavConsumed?: () => void;
}) {
  const portal: Portal = memberPortal ? 'member' : 'society';
  const [screen, setScreen] = useState<Screen>({ name: 'list' });

  useEffect(() => {
    if (initialTharavId) {
      setScreen({ name: 'detail', id: initialTharavId });
      onInitialTharavConsumed?.();
    }
  }, [initialTharavId, onInitialTharavConsumed]);

  switch (screen.name) {
    case 'detail':
      return portal === 'member' ? (
        <MemberReader id={screen.id} onBack={() => setScreen({ name: 'list' })} onSign={(t) => setScreen({ name: 'sign', tharav: t })} />
      ) : (
        <OfficeDetail
          id={screen.id}
          onBack={() => setScreen({ name: 'list' })}
          onEdit={(t) => setScreen({ name: 'form', tharav: t })}
          onAmend={(t) => setScreen({ name: 'form', amend: t })}
          onDeleted={() => setScreen({ name: 'list' })}
        />
      );
    case 'form':
      return (
        <TharavForm
          tharav={screen.tharav}
          amend={screen.amend}
          onDone={(id) => setScreen(id ? { name: 'detail', id } : { name: 'list' })}
        />
      );
    case 'sign':
      return (
        <SignScreen
          tharav={screen.tharav}
          onBack={() => setScreen({ name: 'detail', id: screen.tharav.id })}
          onSigned={(signedAt) => setScreen({ name: 'signed', tharav: screen.tharav, signedAt })}
        />
      );
    case 'signed':
      return <SignedScreen tharav={screen.tharav} signedAt={screen.signedAt} onDone={() => setScreen({ name: 'list' })} />;
    default:
      return (
        <TharavList portal={portal} onOpen={(id) => setScreen({ name: 'detail', id })} onCreate={() => setScreen({ name: 'form' })} />
      );
  }
}

// ---------------------------------------------------------------- list / archive

function TharavList({ portal, onOpen, onCreate }: { portal: Portal; onOpen: (id: string) => void; onCreate: () => void }) {
  const { theme } = useTheme();
  const [items, setItems] = useState<TharavSummary[] | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const page = await fetchTharavs(portal, { q: q.trim() || undefined, status: status || undefined });
      setItems(page.items);
      setCanCreate(!!page.canCreate);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load Tharavs'));
    }
  }, [portal, q, status]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  const filters = portal === 'society' ? ['', 'DRAFT', 'PUBLISHED', 'SUPERSEDED'] : [];
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.pageBg }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.text }]}>Tharav</Text>
        {canCreate ? (
          <Pressable onPress={onCreate} style={({ pressed }) => [styles.addBtn, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addText}>New</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.meta, { color: theme.textMuted, marginBottom: 8 }]}>Society resolutions. Search by number, title or words.</Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search Tharav no., title, text…"
        placeholderTextColor={theme.placeholder}
        style={[styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }]}
      />
      {filters.length ? (
        <View style={styles.chips}>
          {filters.map((f) => (
            <Pressable key={f || 'all'} onPress={() => setStatus(f)} style={[styles.chip, { borderColor: status === f ? theme.accent : theme.cardBorder, backgroundColor: status === f ? theme.accent : theme.cardBg }]}>
              <Text style={{ color: status === f ? '#fff' : theme.text, fontWeight: '700', fontSize: 12 }}>{f ? STATUS[f].label : 'All'}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {error ? <ListError message={error} onRetry={() => void load()} /> : null}
      {items === null && !error ? <ActivityIndicator color={theme.accent} /> : null}
      {items !== null && items.length === 0 ? <ListEmpty message={q ? 'No Tharav matches your search.' : 'No Tharavs yet.'} /> : null}
      {(items ?? []).map((t) => {
        const s = STATUS[t.status];
        const mine = t.myStatus ? MY_STATUS[t.myStatus] : null;
        return (
          <Pressable key={t.id} onPress={() => onOpen(t.id)} style={({ pressed }) => [styles.row, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, opacity: pressed ? 0.9 : 1 }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={2}>{titleOf(t)}</Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                Resolved {day(t.resolutionDate)}{t.category ? ` · ${t.category}` : ''}
              </Text>
              {t.signedCount != null ? (
                <Text style={[styles.meta, { color: theme.textMuted }]}>Signed {t.signedCount} of {t.eligibleCount} flats</Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={[styles.badge, { color: s.color, borderColor: s.color }]}>{s.label}</Text>
              {mine && t.status === 'PUBLISHED' ? <Text style={[styles.badge, { color: mine.color, borderColor: mine.color }]}>{mine.label}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ---------------------------------------------------------------- shared content view

function TharavContent({ tharav, portal, onViewedFile, onRemoveFile }: { tharav: TharavDetail; portal: Portal; onViewedFile?: (id: string) => void; onRemoveFile?: (id: string) => void }) {
  const { theme } = useTheme();
  const s = STATUS[tharav.status];
  return (
    <>
      <SectionCard title={titleOf(tharav)} subtitle={`Resolution date ${day(tharav.resolutionDate)}`}>
        <Text style={[styles.badge, styles.badgeInline, { color: s.color, borderColor: s.color }]}>{s.label}</Text>
        {tharav.supersededBy ? (
          <Text style={[styles.notice, { color: '#b45309' }]}>Replaced by Tharav No. {tharav.supersededBy.tharavNumber}: {tharav.supersededBy.title}</Text>
        ) : null}
        {tharav.supersedes ? (
          <Text style={[styles.notice, { color: theme.textMuted }]}>Amends Tharav No. {tharav.supersedes.tharavNumber}: {tharav.supersedes.title}</Text>
        ) : null}
        {tharav.meeting ? <Text style={[styles.meta, { color: theme.textMuted }]}>Meeting: {tharav.meeting.title} ({day(tharav.meeting.meetingDate)})</Text> : null}
        {tharav.category ? <Text style={[styles.meta, { color: theme.textMuted }]}>Category: {tharav.category}</Text> : null}
        {tharav.publishedAt ? <Text style={[styles.meta, { color: theme.textMuted }]}>Published {when(tharav.publishedAt)}{tharav.publishedByName ? ` by ${tharav.publishedByName}` : ''}</Text> : null}
        {tharav.acknowledgeBy ? <Text style={[styles.meta, { color: theme.textMuted }]}>Please sign by {day(tharav.acknowledgeBy)}</Text> : null}
        {tharav.summary ? <Text style={[styles.body, { color: theme.text, fontWeight: '600' }]}>{tharav.summary}</Text> : null}
      </SectionCard>
      {tharav.fullText ? (
        <SectionCard title="Resolution">
          <Text style={[styles.resolution, { color: theme.text }]} selectable>{tharav.fullText}</Text>
        </SectionCard>
      ) : null}
      {tharav.files.length ? (
        <SectionCard title={tharav.files.length > 1 ? `Documents (${tharav.files.length} pages)` : 'Document'} subtitle="Original as uploaded">
          <RecordFiles files={tharav.files} pathFor={(fileId) => tharavFilePath(portal, tharav.id, fileId)} onViewed={onViewedFile} onRemove={onRemoveFile} />
        </SectionCard>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------- member: read, sign, done

function MemberReader({ id, onBack, onSign }: { id: string; onBack: () => void; onSign: (t: TharavDetail) => void }) {
  const { theme } = useTheme();
  const [tharav, setTharav] = useState<TharavDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [viewed, setViewed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTharav('member', id).then(setTharav).catch((e) => setError(apiErrorMessage(e, 'Could not open the Tharav')));
  }, [id]);

  const pdfIds = useMemo(() => (tharav?.files ?? []).filter((f) => f.contentType === 'application/pdf').map((f) => f.id), [tharav]);
  const allPdfsOpened = pdfIds.every((f) => viewed.has(f));
  const readComplete = reachedEnd && allPdfsOpened;

  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 80) setReachedEnd(true);
  }

  // A resolution that fits on one screen needs no scrolling to be fully visible.
  useEffect(() => {
    if (viewportHeight > 0 && contentHeight > 0 && contentHeight <= viewportHeight + 80) setReachedEnd(true);
  }, [viewportHeight, contentHeight]);

  if (error) return <ListError message={error} />;
  if (!tharav) return <View style={[styles.center, { backgroundColor: theme.pageBg }]}><ActivityIndicator color={theme.accent} /></View>;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.pageBg }}
      contentContainerStyle={styles.content}
      onScroll={onScroll}
      scrollEventThrottle={100}
      onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
      onContentSizeChange={(_, h) => setContentHeight(h)}
    >
      <Pressable onPress={onBack} style={styles.back}>
        <Ionicons name="arrow-back" size={18} color={theme.accentGold} />
        <Text style={{ color: theme.accentGold, fontWeight: '700' }}>All Tharavs</Text>
      </Pressable>
      <TharavContent tharav={tharav} portal="member" onViewedFile={(fid) => setViewed((v) => new Set(v).add(fid))} />
      <SectionCard title="Your acknowledgment">
        {tharav.signedAt ? (
          <Text style={[styles.body, { color: '#047857', fontWeight: '700' }]}>You signed this Tharav on {when(tharav.signedAt)}.</Text>
        ) : tharav.canSign ? (
          <>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {readComplete
                ? 'You have read the full resolution. You can now sign it.'
                : pdfIds.length && !allPdfsOpened
                  ? 'Open every attached PDF and scroll to the end to continue.'
                  : 'Scroll to the end of the resolution to continue.'}
            </Text>
            <Pressable
              disabled={!readComplete}
              onPress={() => onSign(tharav)}
              style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: !readComplete ? 0.45 : pressed ? 0.9 : 1 }]}
            >
              <Text style={styles.primaryText}>Read and sign</Text>
            </Pressable>
          </>
        ) : (
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            {tharav.status === 'SUPERSEDED' ? 'This Tharav has been replaced and is kept for the record.' : tharav.signNote ?? 'No signature needed.'}
          </Text>
        )}
      </SectionCard>
    </ScrollView>
  );
}

function SignScreen({ tharav, onBack, onSigned }: { tharav: TharavDetail; onBack: () => void; onSigned: (signedAt: string) => void }) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(png: string) {
    setSending(true);
    try {
      const r = await signTharav(tharav.id, png);
      onSigned(r.signedAt);
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not record your signature'), 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.pageBg }} contentContainerStyle={styles.content} scrollEnabled={!agreed}>
      <Pressable onPress={onBack} style={styles.back}>
        <Ionicons name="arrow-back" size={18} color={theme.accentGold} />
        <Text style={{ color: theme.accentGold, fontWeight: '700' }}>Back to the resolution</Text>
      </Pressable>
      <SectionCard title="Sign Tharav" subtitle={titleOf(tharav)}>
        <Pressable onPress={() => setAgreed((a) => !a)} style={styles.agreeRow}>
          <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={24} color={agreed ? theme.accent : theme.textMuted} />
          <Text style={[styles.body, { color: theme.text, flex: 1, marginTop: 0 }]}>{tharav.statement}</Text>
        </Pressable>
        <Text style={[styles.meta, { color: theme.textMuted, marginVertical: 8 }]}>
          Signing records that you read and acknowledged this resolution. It is not a vote for or against it.
        </Text>
        {agreed ? (
          <SignaturePad
            submitLabel={sending ? 'Saving…' : 'Sign'}
            disabled={sending}
            onSigned={(png) => void submit(png)}
            onEmpty={() => toast('Draw your signature first', 'error')}
          />
        ) : (
          <Text style={[styles.meta, { color: theme.textMuted }]}>Tick the statement above to sign.</Text>
        )}
      </SectionCard>
    </ScrollView>
  );
}

function SignedScreen({ tharav, signedAt, onDone }: { tharav: TharavDetail; signedAt: string; onDone: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.pageBg, padding: 24 }]}>
      <Ionicons name="checkmark-circle" size={72} color="#047857" />
      <Text style={[styles.title, { color: theme.text, textAlign: 'center', marginTop: 12 }]}>Signed</Text>
      <Text style={[styles.body, { color: theme.textMuted, textAlign: 'center' }]}>
        You signed {titleOf(tharav)} on {when(signedAt)}. The society office has been notified.
      </Text>
      <Pressable onPress={onDone} style={[styles.primary, { backgroundColor: theme.accent, alignSelf: 'stretch' }]}>
        <Text style={styles.primaryText}>Done</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------- office: detail, tracking, history

function OfficeDetail({ id, onBack, onEdit, onAmend, onDeleted }: { id: string; onBack: () => void; onEdit: (t: TharavDetail) => void; onAmend: (t: TharavDetail) => void; onDeleted: () => void }) {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const [tharav, setTharav] = useState<TharavDetail | null>(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  /** Signature report: resolution, summary and a building-wise table with every signature; opens the share sheet. */
  async function downloadReport() {
    setDownloading(true);
    try {
      const token = await getToken();
      const target = `${FileSystem.cacheDirectory}tharav-${tharav?.tharavNumber ?? id}-signatures.pdf`;
      const result = await FileSystem.downloadAsync(`${API_BASE_URL}/society/tharavs/${id}/report.pdf`, target, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (result.status !== 200) throw new Error('Could not create the report. Please try again.');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Tharav No. ${tharav?.tharavNumber} signatures` });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not download the report', 'error');
    } finally {
      setDownloading(false);
    }
  }
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [signatureOf, setSignatureOf] = useState<{ memberId: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setTharav(await fetchTharav('society', id, filter || undefined));
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load the Tharav'));
    }
  }, [id, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, done: string, after?: () => void) {
    setBusy(true);
    try {
      await action();
      toast(done, 'success');
      if (after) after();
      else await load();
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function attach() {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true, multiple: true });
    if (picked.canceled || !picked.assets?.length) return;
    setBusy(true);
    try {
      for (const asset of picked.assets) {
        await uploadTharavFile(id, { uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
      }
      await load();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not upload'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function loadHistory() {
    try {
      const page = await fetchTharavHistory(id);
      setHistory(page.items ?? page.content ?? []);
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not load history'), 'error');
    }
  }

  if (error) return <ListError message={error} onRetry={() => void load()} />;
  if (!tharav) return <View style={[styles.center, { backgroundColor: theme.pageBg }]}><ActivityIndicator color={theme.accent} /></View>;
  const draft = tharav.status === 'DRAFT';
  const t = tharav.tracking;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.pageBg }} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.back}>
        <Ionicons name="arrow-back" size={18} color={theme.accentGold} />
        <Text style={{ color: theme.accentGold, fontWeight: '700' }}>All Tharavs</Text>
      </Pressable>
      <TharavContent tharav={tharav} portal="society" onRemoveFile={draft && tharav.canEdit ? (fid) => void run(() => removeTharavFile(id, fid), 'Removed') : undefined} />

      {draft ? (
        <SectionCard title="Draft" subtitle="Members cannot see drafts. Publishing gives it a number and notifies all flat owners.">
          {tharav.canEdit ? (
            <>
              <Pressable onPress={() => onEdit(tharav)} style={[styles.secondary, { borderColor: theme.accent }]}>
                <Text style={{ color: theme.accent, fontWeight: '800' }}>Edit text and details</Text>
              </Pressable>
              <Pressable disabled={busy} onPress={() => void attach()} style={[styles.secondary, { borderColor: theme.accent, marginTop: 8 }]}>
                <Text style={{ color: theme.accent, fontWeight: '800' }}>{busy ? 'Uploading…' : 'Upload scanned resolution (PDF or photos)'}</Text>
              </Pressable>
            </>
          ) : null}
          {tharav.canPublish ? (
            <Pressable
              disabled={busy}
              onPress={() =>
                confirm({
                  title: 'Publish this Tharav?',
                  message: 'It gets the next Tharav number, can no longer be edited or deleted, and every flat owner is asked to read and sign it.',
                  confirmText: 'Publish',
                  onConfirm: () => run(() => publishTharav(id), 'Published. Owners have been notified.'),
                })
              }
              style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={styles.primaryText}>Publish</Text>
            </Pressable>
          ) : (
            <Text style={[styles.meta, { color: theme.textMuted, marginTop: 8 }]}>Only the chairman can publish.</Text>
          )}
          {tharav.canEdit ? (
            <Pressable
              onPress={() =>
                confirm({
                  title: 'Discard draft?',
                  message: 'The draft and its uploads will be removed.',
                  confirmText: 'Discard',
                  destructive: true,
                  onConfirm: () => run(() => deleteTharavDraft(id), 'Draft discarded', onDeleted),
                })
              }
              style={styles.cancel}
            >
              <Text style={{ color: '#b91c1c', fontWeight: '700' }}>Discard draft</Text>
            </Pressable>
          ) : null}
        </SectionCard>
      ) : null}

      {t ? (
        <SectionCard title="Signatures" subtitle={`${t.signedCount} of ${t.eligibleCount} flats signed`}>
          <View style={styles.stats}>
            {[
              ['Eligible', t.eligibleCount],
              ['Read', t.openedCount],
              ['Signed', t.signedCount],
              ['Not opened', t.notOpenedCount],
            ].map(([label, value]) => (
              <View key={String(label)} style={[styles.stat, { borderColor: theme.cardBorder }]}>
                <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>{label}</Text>
              </View>
            ))}
          </View>
          <Pressable
            disabled={downloading}
            onPress={() => void downloadReport()}
            style={({ pressed }) => [styles.secondary, { borderColor: theme.accent, marginBottom: 12, flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: pressed ? 0.85 : 1 }]}
          >
            {downloading ? <ActivityIndicator color={theme.accent} /> : <Ionicons name="download-outline" size={18} color={theme.accent} />}
            <Text style={{ color: theme.accent, fontWeight: '800' }}>{downloading ? 'Preparing PDF…' : 'Download signature report (PDF)'}</Text>
          </Pressable>
          <View style={styles.chips}>
            {[['', 'All'], ['SIGNED', 'Signed'], ['PENDING', 'Pending'], ['NOT_OPENED', 'Not opened']].map(([key, label]) => (
              <Pressable key={key || 'all'} onPress={() => setFilter(key)} style={[styles.chip, { borderColor: filter === key ? theme.accent : theme.cardBorder, backgroundColor: filter === key ? theme.accent : theme.cardBg }]}>
                <Text style={{ color: filter === key ? '#fff' : theme.text, fontWeight: '700', fontSize: 12 }}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {t.members.length === 0 ? <Text style={[styles.meta, { color: theme.textMuted }]}>No flats in this view.</Text> : null}
          {t.members.map((m) => {
            const st = MY_STATUS[m.status];
            return (
              <Pressable
                key={m.memberId}
                disabled={!m.hasSignature}
                onPress={() => setSignatureOf({ memberId: m.memberId, name: `${m.memberName} (${unitName(m.flatNumber)})` })}
                style={[styles.memberRow, { borderColor: theme.cardBorder }]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.rowTitle, { color: theme.text, fontSize: 14 }]}>{unitName(m.flatNumber)} · {m.memberName}</Text>
                  <Text style={[styles.meta, { color: theme.textMuted }]}>
                    {m.signedAt ? `Signed ${when(m.signedAt)}` : m.openedAt ? `Read ${when(m.openedAt)}` : 'Not opened yet'}
                  </Text>
                </View>
                <Text style={[styles.badge, { color: st.color, borderColor: st.color }]}>{st.label}</Text>
                {m.hasSignature ? <Ionicons name="create-outline" size={18} color={theme.accent} /> : null}
              </Pressable>
            );
          })}
        </SectionCard>
      ) : null}

      {tharav.canAmend ? (
        <SectionCard title="Correction" subtitle="A published Tharav is never changed. Create an amendment; the original stays in the archive.">
          <Pressable onPress={() => onAmend(tharav)} style={[styles.secondary, { borderColor: theme.accent }]}>
            <Text style={{ color: theme.accent, fontWeight: '800' }}>Create amendment</Text>
          </Pressable>
        </SectionCard>
      ) : null}

      <SectionCard title="History">
        {history === null ? (
          <Pressable onPress={() => void loadHistory()} style={[styles.secondary, { borderColor: theme.cardBorder }]}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>Show audit history</Text>
          </Pressable>
        ) : history.length === 0 ? (
          <Text style={[styles.meta, { color: theme.textMuted }]}>No history yet.</Text>
        ) : (
          history.map((h) => (
            <Text key={h.id} style={[styles.meta, { color: theme.text }]}>
              {when(h.createdAt)} · {h.actorLabel ?? 'System'} · {h.summary ?? h.action}
            </Text>
          ))
        )}
      </SectionCard>

      <Modal visible={!!signatureOf} transparent animationType="fade" onRequestClose={() => setSignatureOf(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSignatureOf(null)}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>{signatureOf?.name}</Text>
            {signatureOf ? (
              <AuthenticatedImage path={tharavSignaturePath('society', id, signatureOf.memberId)} style={styles.signatureImage} resizeMode="contain" />
            ) : null}
            <Text style={[styles.meta, { color: theme.textMuted }]}>Tap anywhere to close</Text>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// ---------------------------------------------------------------- office: create / edit / amend

function TharavForm({ tharav, amend, onDone }: { tharav?: TharavDetail; amend?: TharavDetail; onDone: (id?: string) => void }) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const base = tharav ?? amend;
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<TharavInput>({
    title: amend ? `${amend.title} (amended)` : base?.title ?? '',
    meetingId: base?.meeting?.id ?? null,
    resolutionDate: tharav?.resolutionDate ?? today,
    summary: base?.summary ?? '',
    fullText: base?.fullText ?? '',
    category: base?.category ?? '',
    acknowledgeBy: tharav?.acknowledgeBy ?? null,
    supersedesId: amend?.id ?? null,
  });
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [saving, setSaving] = useState(false);
  const input = [styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }];
  const set = (key: keyof TharavInput) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    fetchMeetings('society').then((p) => setMeetings(p.items.filter((m) => m.status !== 'CANCELLED'))).catch(() => setMeetings([]));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const body: TharavInput = { ...form, acknowledgeBy: form.acknowledgeBy || null };
      const saved = tharav ? await updateTharav(tharav.id, body) : await createTharav(body);
      toast('Draft saved. Add documents or publish from the next screen.', 'success');
      onDone(saved.id);
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not save'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.pageBg }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SectionCard
        title={amend ? `Amend Tharav No. ${amend.tharavNumber}` : tharav ? 'Edit draft' : 'New Tharav'}
        subtitle="Type the resolution, or save and then upload the scanned document"
      >
        <Text style={[styles.label, { color: theme.text }]}>Title</Text>
        <TextInput style={input} value={form.title} onChangeText={set('title')} placeholder="Lift repair approved" placeholderTextColor={theme.placeholder} />
        <Text style={[styles.label, { color: theme.text }]}>Meeting (optional)</Text>
        <View style={styles.chips}>
          <Pressable onPress={() => setForm((f) => ({ ...f, meetingId: null }))} style={[styles.chip, { borderColor: !form.meetingId ? theme.accent : theme.cardBorder, backgroundColor: !form.meetingId ? theme.accent : theme.cardBg }]}>
            <Text style={{ color: !form.meetingId ? '#fff' : theme.text, fontWeight: '700', fontSize: 12 }}>None</Text>
          </Pressable>
          {meetings.slice(0, 8).map((m) => (
            <Pressable key={m.id} onPress={() => setForm((f) => ({ ...f, meetingId: m.id }))} style={[styles.chip, { borderColor: form.meetingId === m.id ? theme.accent : theme.cardBorder, backgroundColor: form.meetingId === m.id ? theme.accent : theme.cardBg }]}>
              <Text style={{ color: form.meetingId === m.id ? '#fff' : theme.text, fontWeight: '700', fontSize: 12 }} numberOfLines={1}>{day(m.meetingDate)} · {m.title}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.two}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.text }]}>Resolution date</Text>
            <TextInput style={input} value={form.resolutionDate} onChangeText={set('resolutionDate')} placeholder="YYYY-MM-DD" placeholderTextColor={theme.placeholder} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.text }]}>Sign by (optional)</Text>
            <TextInput style={input} value={form.acknowledgeBy ?? ''} onChangeText={set('acknowledgeBy')} placeholder="YYYY-MM-DD" placeholderTextColor={theme.placeholder} />
          </View>
        </View>
        <Text style={[styles.label, { color: theme.text }]}>Category (optional)</Text>
        <TextInput style={input} value={form.category ?? ''} onChangeText={set('category')} placeholder="Maintenance, Finance, Rules…" placeholderTextColor={theme.placeholder} />
        <Text style={[styles.label, { color: theme.text }]}>Short description</Text>
        <TextInput style={[input, styles.area]} multiline value={form.summary ?? ''} onChangeText={set('summary')} placeholderTextColor={theme.placeholder} />
        <Text style={[styles.label, { color: theme.text }]}>Full resolution text</Text>
        <TextInput style={[input, styles.areaLarge]} multiline value={form.fullText ?? ''} onChangeText={set('fullText')} placeholder="Resolved that…" placeholderTextColor={theme.placeholder} />
        <Pressable disabled={saving} onPress={() => void save()} style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: saving ? 0.6 : pressed ? 0.9 : 1 }]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save draft</Text>}
        </Pressable>
        <Pressable onPress={() => onDone(tharav?.id ?? amend?.id)} style={styles.cancel}>
          <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Cancel</Text>
        </Pressable>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 40, gap: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  addText: { color: '#fff', fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, maxWidth: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },
  rowTitle: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  badge: { fontSize: 11, fontWeight: '800', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  badgeInline: { alignSelf: 'flex-start', marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 21, marginTop: 6 },
  notice: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  resolution: { fontSize: 15, lineHeight: 24 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  secondary: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', paddingHorizontal: 8 },
  primary: { marginTop: 14, borderRadius: 14, paddingVertical: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancel: { alignItems: 'center', paddingVertical: 12 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 15 },
  area: { minHeight: 70, textAlignVertical: 'top' },
  areaLarge: { minHeight: 180, textAlignVertical: 'top' },
  two: { flexDirection: 'row', gap: 10 },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 6 },
  agreeRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: 16, padding: 16, gap: 10, alignItems: 'center' },
  signatureImage: { width: '100%', height: 200, backgroundColor: '#fff', borderRadius: 8 },
});
