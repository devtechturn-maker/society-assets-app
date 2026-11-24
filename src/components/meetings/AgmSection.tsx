import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { SectionCard } from '../dashboard/SectionCard';
import { downloadPdfToDevice } from '../../services/api';
import {
  addAgmResolution,
  closeAgmResolution,
  fetchAgm,
  markAgmAttendance,
  minutesPdfPath,
  openAgmResolution,
  saveAgmMinutes,
  setupAgm,
  voteAgmResolution,
  type AgmResolution,
  type AgmView,
  type VoteChoice,
} from '../../services/officeV23';
import type { Portal } from '../../services/records';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { apiErrorMessage } from '../../utils/apiError';
import { unitName } from '../../utils/unitName';

const RESULT: Record<AgmResolution['status'], { label: string; color: string }> = {
  DRAFT: { label: 'Not open yet', color: '#64748b' },
  OPEN: { label: 'Voting open', color: '#b45309' },
  PASSED: { label: 'Passed', color: '#047857' },
  REJECTED: { label: 'Not passed', color: '#b91c1c' },
};

const CHOICES: { id: VoteChoice; label: string }[] = [
  { id: 'FOR', label: 'For' },
  { id: 'AGAINST', label: 'Against' },
  { id: 'ABSTAIN', label: 'Abstain' },
];

/** v23 AGM tools inside a meeting: quorum, attendance, resolution voting and minutes. */
export function AgmSection({ portal, meetingId }: { portal: Portal; meetingId: string }) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [agm, setAgm] = useState<AgmView | null>(null);
  const [busy, setBusy] = useState(false);
  const [quorum, setQuorum] = useState('33');
  const [type, setType] = useState<'AGM' | 'SGM'>('AGM');
  const [showAttendance, setShowAttendance] = useState(false);
  const [adding, setAdding] = useState(false);
  const [res, setRes] = useState({ title: '', details: '', proposedBy: '', secondedBy: '' });
  const [minutes, setMinutes] = useState('');

  const load = useCallback(async () => {
    try {
      const v = await fetchAgm(portal, meetingId);
      setAgm(v);
      setMinutes(v.minutes ?? '');
    } catch {
      setAgm(null);
    }
  }, [portal, meetingId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<AgmView>, done?: string) {
    setBusy(true);
    try {
      const v = await action();
      setAgm(v);
      if (done) toast(done, 'success');
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function pdf() {
    setBusy(true);
    try {
      const { uri } = await downloadPdfToDevice(minutesPdfPath(portal, meetingId), 'minutes.pdf');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Minutes' });
      }
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not make the PDF'), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!agm) return null;
  const manage = agm.canManage && portal === 'society' && agm.status !== 'CANCELLED';
  const input = [styles.input, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg, color: theme.inputText }];

  if (agm.meetingType === 'GENERAL') {
    if (!manage) return null;
    return (
      <SectionCard title="AGM tools" subtitle="Attendance and quorum, voting on resolutions, minutes PDF">
        <View style={styles.chips}>
          {(['AGM', 'SGM'] as const).map((t) => (
            <Pressable key={t} onPress={() => setType(t)} style={[styles.chip, { borderColor: theme.accent, backgroundColor: type === t ? theme.accent : 'transparent' }]}>
              <Text style={{ color: type === t ? '#fff' : theme.accent, fontWeight: '800' }}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.label, { color: theme.text }]}>Quorum (% of flats that must attend)</Text>
        <TextInput style={input} value={quorum} onChangeText={(t) => setQuorum(t.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" />
        <Pressable
          disabled={busy}
          onPress={() => void run(() => setupAgm(meetingId, type, Number(quorum) || 33), 'AGM tools on')}
          style={[styles.primary, { backgroundColor: theme.accent }]}
        >
          <Text style={styles.primaryText}>Use AGM tools</Text>
        </Pressable>
      </SectionCard>
    );
  }

  const qColor = agm.quorumMet ? '#047857' : '#b45309';
  return (
    <>
      <SectionCard title={`${agm.meetingType} · quorum`} subtitle={`${agm.quorumPercent}% of ${agm.totalFlats} flats = ${agm.quorumNeeded} needed`}>
        <Text style={[styles.big, { color: qColor }]}>
          {agm.presentFlats} / {agm.totalFlats} present
        </Text>
        <Text style={{ color: qColor, fontWeight: '800' }}>{agm.quorumMet ? 'Quorum met' : 'Quorum not met yet'}</Text>
        {manage && agm.attendance ? (
          <>
            <Pressable onPress={() => setShowAttendance(!showAttendance)} style={[styles.secondary, { borderColor: theme.accent, marginTop: 10 }]}>
              <Text style={{ color: theme.accent, fontWeight: '800' }}>{showAttendance ? 'Hide attendance' : 'Mark attendance'}</Text>
            </Pressable>
            {showAttendance
              ? agm.attendance.map((a) => (
                  <Pressable
                    key={a.flatId}
                    disabled={busy}
                    onPress={() => void run(() => markAgmAttendance(meetingId, a.flatId, !a.present))}
                    style={[styles.attRow, { borderColor: theme.cardBorder }]}
                  >
                    <Text style={{ color: a.present ? '#047857' : theme.textMuted, fontSize: 18 }}>{a.present ? '☑' : '☐'}</Text>
                    <Text style={{ color: theme.text, flex: 1 }}>
                      {unitName(a.flatNumber)} · {a.name ?? '—'}
                    </Text>
                  </Pressable>
                ))
              : null}
          </>
        ) : null}
      </SectionCard>

      <SectionCard title="Resolutions" subtitle={agm.canVote ? 'One vote per flat' : manage ? 'Open voting when the item comes up' : undefined}>
        {agm.resolutions.length === 0 ? <Text style={{ color: theme.textMuted }}>No resolutions yet.</Text> : null}
        {agm.resolutions.map((r) => {
          const result = RESULT[r.status];
          return (
            <View key={r.id} style={[styles.res, { borderColor: theme.cardBorder }]}>
              <Text style={[styles.resTitle, { color: theme.text }]}>
                {r.itemNo}. {r.title}
              </Text>
              {r.details ? <Text style={{ color: theme.textMuted, marginTop: 2 }}>{r.details}</Text> : null}
              {r.proposedBy || r.secondedBy ? (
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                  {r.proposedBy ? `Proposed: ${r.proposedBy}` : ''}
                  {r.secondedBy ? `  Seconded: ${r.secondedBy}` : ''}
                </Text>
              ) : null}
              <Text style={{ color: result.color, fontWeight: '800', marginTop: 6 }}>
                {result.label}
                {r.status !== 'DRAFT' ? ` · For ${r.forVotes} · Against ${r.againstVotes} · Abstain ${r.abstainVotes}` : ''}
              </Text>
              {r.myVote ? <Text style={{ color: theme.textMuted, marginTop: 2 }}>Your flat voted: {r.myVote.toLowerCase()}</Text> : null}
              {agm.canVote && r.status === 'OPEN' && !r.myVote ? (
                <View style={[styles.chips, { marginTop: 8 }]}>
                  {CHOICES.map((c) => (
                    <Pressable
                      key={c.id}
                      disabled={busy}
                      onPress={() => void run(() => voteAgmResolution(r.id, c.id), 'Vote saved')}
                      style={[styles.chip, { borderColor: theme.accent }]}
                    >
                      <Text style={{ color: theme.accent, fontWeight: '800' }}>{c.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {manage && r.status === 'DRAFT' ? (
                <Pressable disabled={busy} onPress={() => void run(() => openAgmResolution(r.id), 'Voting opened')} style={[styles.secondary, { borderColor: theme.accent, marginTop: 8 }]}>
                  <Text style={{ color: theme.accent, fontWeight: '800' }}>Open voting</Text>
                </Pressable>
              ) : null}
              {manage && r.status === 'OPEN' ? (
                <Pressable disabled={busy} onPress={() => void run(() => closeAgmResolution(r.id), 'Voting closed')} style={[styles.secondary, { borderColor: theme.accent, marginTop: 8 }]}>
                  <Text style={{ color: theme.accent, fontWeight: '800' }}>Close voting and show result</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
        {manage ? (
          adding ? (
            <View style={{ marginTop: 8 }}>
              <TextInput style={input} value={res.title} onChangeText={(t) => setRes({ ...res, title: t })} placeholder="Resolution, e.g. Approve accounts 2025-26" placeholderTextColor={theme.placeholder} />
              <TextInput style={[input, { marginTop: 8 }]} value={res.details} onChangeText={(t) => setRes({ ...res, details: t })} placeholder="Details (optional)" placeholderTextColor={theme.placeholder} multiline />
              <View style={styles.two}>
                <TextInput style={[input, styles.flex]} value={res.proposedBy} onChangeText={(t) => setRes({ ...res, proposedBy: t })} placeholder="Proposed by" placeholderTextColor={theme.placeholder} />
                <TextInput style={[input, styles.flex]} value={res.secondedBy} onChangeText={(t) => setRes({ ...res, secondedBy: t })} placeholder="Seconded by" placeholderTextColor={theme.placeholder} />
              </View>
              <Pressable
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    const v = await addAgmResolution(meetingId, res);
                    setRes({ title: '', details: '', proposedBy: '', secondedBy: '' });
                    setAdding(false);
                    return v;
                  }, 'Resolution added')
                }
                style={[styles.primary, { backgroundColor: theme.accent }]}
              >
                <Text style={styles.primaryText}>Add resolution</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setAdding(true)} style={[styles.secondary, { borderColor: theme.accent, marginTop: 8 }]}>
              <Text style={{ color: theme.accent, fontWeight: '800' }}>+ Add resolution</Text>
            </Pressable>
          )
        ) : null}
      </SectionCard>

      <SectionCard title="Minutes">
        {manage ? (
          <>
            <TextInput
              style={[input, { minHeight: 110, textAlignVertical: 'top' }]}
              value={minutes}
              onChangeText={setMinutes}
              multiline
              placeholder="What was discussed and decided"
              placeholderTextColor={theme.placeholder}
            />
            <Pressable disabled={busy} onPress={() => void run(() => saveAgmMinutes(meetingId, minutes), 'Minutes saved')} style={[styles.secondary, { borderColor: theme.accent, marginTop: 8 }]}>
              <Text style={{ color: theme.accent, fontWeight: '800' }}>Save minutes</Text>
            </Pressable>
          </>
        ) : agm.minutes ? (
          <Text style={{ color: theme.text, lineHeight: 21 }}>{agm.minutes}</Text>
        ) : (
          <Text style={{ color: theme.textMuted }}>Minutes are not written yet.</Text>
        )}
        <Pressable disabled={busy} onPress={() => void pdf()} style={[styles.primary, { backgroundColor: theme.accent }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Minutes PDF</Text>}
        </Pressable>
      </SectionCard>
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  primary: { marginTop: 12, borderRadius: 14, paddingVertical: 13, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondary: { borderWidth: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  big: { fontSize: 26, fontWeight: '900' },
  attRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, paddingVertical: 10 },
  res: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  resTitle: { fontSize: 15, fontWeight: '800' },
  two: { flexDirection: 'row', gap: 8, marginTop: 8 },
  flex: { flex: 1 },
});
