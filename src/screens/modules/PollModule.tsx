import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  closePoll,
  createPoll,
  fetchMembers,
  fetchPollDetail,
  fetchPolls,
  sharePollResults,
  voteOnPoll,
} from '../../services/api';
import type { PollDetail, PollSummary, SocietyMember } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { ListEmpty, ListError } from '../../components/dashboard/ListStates';
import { useAppAlert } from '../../context/AppAlertContext';
import { useHardwareBack } from '../../hooks/useHardwareBack';

type Screen = 'list' | 'create' | 'detail' | 'share';

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function PollModule({
  memberPortal = false,
  canManagePolls = false,
  initialPollId,
  onInitialPollConsumed,
}: {
  memberPortal?: boolean;
  canManagePolls?: boolean;
  initialPollId?: string | null;
  onInitialPollConsumed?: () => void;
}) {
  const { theme } = useTheme();
  const { alert } = useAppAlert();
  const [screen, setScreen] = useState<Screen>('list');
  const [polls, setPolls] = useState<PollSummary[]>([]);
  const [activePoll, setActivePoll] = useState<PollDetail | null>(null);
  const [members, setMembers] = useState<SocietyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allMembers, setAllMembers] = useState(true);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [shareAllMembers, setShareAllMembers] = useState(true);
  const [shareMemberIds, setShareMemberIds] = useState<string[]>([]);

  useHardwareBack(
    useCallback(() => {
      if (screen === 'share') {
        setScreen('detail');
        return true;
      }
      if (screen === 'create' || screen === 'detail') {
        setScreen('list');
        setActivePoll(null);
        return true;
      }
      return false;
    }, [screen]),
    screen !== 'list'
  );

  const loadPolls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchPolls(memberPortal);
      setPolls(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load polls');
    } finally {
      setLoading(false);
    }
  }, [memberPortal, canManagePolls]);

  const openPoll = useCallback(async (pollId: string) => {
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchPollDetail(memberPortal, pollId);
      setActivePoll(detail);
      setSelectedOptionId(detail.myVoteOptionId ?? null);
      setScreen('detail');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load poll');
    } finally {
      setLoading(false);
    }
  }, [memberPortal, canManagePolls]);

  useEffect(() => {
    void loadPolls();
    if (canManagePolls) {
      fetchMembers()
        .then((rows) => setMembers(rows))
        .catch(() => undefined);
    }
  }, [loadPolls, canManagePolls]);

  useEffect(() => {
    if (!initialPollId) return;
    void openPoll(initialPollId);
    onInitialPollConsumed?.();
  }, [initialPollId, openPoll, onInitialPollConsumed]);

  const memberOptions = useMemo(
    () => members.map((member) => ({ id: member.id, label: `${member.name} · ${member.flatNumber}` })),
    [members]
  );

  async function submitCreate() {
    const trimmedQuestion = question.trim();
    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!trimmedQuestion) {
      await alert('Missing question', 'Enter a poll question.');
      return;
    }
    if (trimmedOptions.length < 2) {
      await alert('Need options', 'Add at least two options.');
      return;
    }
    if (!allMembers && selectedMemberIds.length === 0) {
      await alert('Select members', 'Choose members or send to all members.');
      return;
    }
    setSaving(true);
    try {
      const created = await createPoll({
        question: trimmedQuestion,
        options: trimmedOptions,
        allMembers,
        memberIds: allMembers ? [] : selectedMemberIds,
      });
      await alert('Poll created', 'Members have been notified on their phones.');
      setScreen('list');
      await loadPolls();
      await openPoll(created.pollId);
    } catch (err) {
      await alert('Could not create poll', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function submitVote() {
    if (!activePoll || !selectedOptionId) {
      await alert('Select an option', 'Tap an option before voting.');
      return;
    }
    setSaving(true);
    try {
      const updated = await voteOnPoll(activePoll.pollId, selectedOptionId);
      setActivePoll(updated);
      await alert('Vote recorded', 'You can now see the poll results.');
      await loadPolls();
    } catch (err) {
      await alert('Could not vote', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleClosePoll() {
    if (!activePoll) return;
    setSaving(true);
    try {
      const updated = await closePoll(activePoll.pollId);
      setActivePoll(updated);
      await loadPolls();
    } catch (err) {
      await alert('Could not close poll', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function submitShare() {
    if (!activePoll) return;
    if (!shareAllMembers && shareMemberIds.length === 0) {
      await alert('Select members', 'Choose members or send to all poll members.');
      return;
    }
    setSaving(true);
    try {
      const updated = await sharePollResults(activePoll.pollId, {
        allMembers: shareAllMembers,
        memberIds: shareAllMembers ? [] : shareMemberIds,
      });
      setActivePoll(updated);
      setScreen('detail');
      await alert('Results sent', 'Selected members received a notification.');
    } catch (err) {
      await alert('Could not send results', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  function toggleMember(id: string, selected: string[], setter: (ids: string[]) => void) {
    if (selected.includes(id)) {
      setter(selected.filter((value) => value !== id));
      return;
    }
    setter([...selected, id]);
  }

  if (screen === 'create' && canManagePolls) {
    return (
      <ScrollView style={[styles.root, { backgroundColor: theme.pageBg }]} contentContainerStyle={styles.pad}>
        <Pressable onPress={() => setScreen('list')}>
          <Text style={[styles.backLink, { color: theme.accent }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Create Poll</Text>
        <TextInput
          style={[styles.input, styles.textArea, { color: theme.text, backgroundColor: theme.chipBg }]}
          placeholder="Ask your society…"
          placeholderTextColor={theme.textMuted}
          value={question}
          onChangeText={setQuestion}
          multiline
        />
        <Text style={[styles.label, { color: theme.textMuted }]}>Options</Text>
        {options.map((value, index) => (
          <View key={`option-${index}`} style={styles.optionRow}>
            <TextInput
              style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.chipBg }]}
              placeholder={`Option ${index + 1}`}
              placeholderTextColor={theme.textMuted}
              value={value}
              onChangeText={(text) => {
                const next = [...options];
                next[index] = text;
                setOptions(next);
              }}
            />
            {options.length > 2 ? (
              <Pressable onPress={() => setOptions(options.filter((_, i) => i !== index))}>
                <Text style={{ color: theme.danger }}>✕</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {options.length < 12 ? (
          <Pressable onPress={() => setOptions([...options, ''])}>
            <Text style={[styles.link, { color: theme.accent }]}>+ Add option</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.checkRow} onPress={() => setAllMembers((value) => !value)}>
          <Text style={{ color: theme.text }}>{allMembers ? '☑' : '☐'} Send to all members</Text>
        </Pressable>
        {!allMembers ? (
          <View style={styles.memberPick}>
            {memberOptions.map((member) => (
              <Pressable
                key={member.id}
                style={[styles.memberChip, { backgroundColor: theme.chipBg }]}
                onPress={() => toggleMember(member.id, selectedMemberIds, setSelectedMemberIds)}
              >
                <Text style={{ color: selectedMemberIds.includes(member.id) ? theme.accent : theme.text }}>
                  {selectedMemberIds.includes(member.id) ? '☑ ' : '☐ '}
                  {member.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: theme.accent, opacity: saving ? 0.6 : 1 }]}
          onPress={submitCreate}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create & Notify</Text>}
        </Pressable>
      </ScrollView>
    );
  }

  if (screen === 'share' && canManagePolls && activePoll) {
    return (
      <ScrollView style={[styles.root, { backgroundColor: theme.pageBg }]} contentContainerStyle={styles.pad}>
        <Pressable onPress={() => setScreen('detail')}>
          <Text style={[styles.backLink, { color: theme.accent }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Send Results</Text>
        <Pressable style={styles.checkRow} onPress={() => setShareAllMembers((value) => !value)}>
          <Text style={{ color: theme.text }}>{shareAllMembers ? '☑' : '☐'} Send to all poll members</Text>
        </Pressable>
        {!shareAllMembers ? (
          <View style={styles.memberPick}>
            {memberOptions.map((member) => (
              <Pressable
                key={member.id}
                style={[styles.memberChip, { backgroundColor: theme.chipBg }]}
                onPress={() => toggleMember(member.id, shareMemberIds, setShareMemberIds)}
              >
                <Text style={{ color: shareMemberIds.includes(member.id) ? theme.accent : theme.text }}>
                  {shareMemberIds.includes(member.id) ? '☑ ' : '☐ '}
                  {member.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: theme.accent, opacity: saving ? 0.6 : 1 }]}
          onPress={submitShare}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send Notification</Text>}
        </Pressable>
      </ScrollView>
    );
  }

  if (screen === 'detail' && activePoll) {
    return (
      <ScrollView style={[styles.root, { backgroundColor: theme.pageBg }]} contentContainerStyle={styles.pad}>
        <Pressable onPress={() => { setScreen('list'); setActivePoll(null); }}>
          <Text style={[styles.backLink, { color: theme.accent }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{activePoll.question}</Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          {activePoll.totalVotes} vote{activePoll.totalVotes === 1 ? '' : 's'} · {activePoll.status}
        </Text>
        {activePoll.options.map((option) => {
          const selected = selectedOptionId === option.optionId;
          const showResults = activePoll.showResults;
          return (
            <Pressable
              key={option.optionId}
              style={[
                styles.optionCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: selected ? theme.accent : theme.cardBorder,
                },
              ]}
              onPress={() => {
                if (activePoll.canVote) setSelectedOptionId(option.optionId);
              }}
              disabled={!activePoll.canVote}
            >
              <View style={styles.optionTop}>
                <Text style={[styles.optionLabel, { color: theme.text }]}>{option.label}</Text>
                {showResults ? (
                  <Text style={{ color: theme.textMuted }}>
                    {option.voteCount ?? 0} · {option.percentage ?? 0}%
                  </Text>
                ) : null}
              </View>
              {showResults ? (
                <View style={[styles.barTrack, { backgroundColor: theme.chipBg }]}>
                  <View
                    style={[styles.barFill, { width: `${option.percentage ?? 0}%`, backgroundColor: theme.accent }]}
                  />
                </View>
              ) : null}
            </Pressable>
          );
        })}
        {activePoll.canVote ? (
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: theme.accent, opacity: saving ? 0.6 : 1 }]}
            onPress={submitVote}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Vote</Text>}
          </Pressable>
        ) : null}
        {canManagePolls && activePoll.status === 'ACTIVE' ? (
          <Pressable style={[styles.secondaryBtn, { borderColor: theme.cardBorder }]} onPress={handleClosePoll}>
            <Text style={{ color: theme.text }}>Close Poll</Text>
          </Pressable>
        ) : null}
        {canManagePolls && activePoll.showResults ? (
          <Pressable
            style={[styles.secondaryBtn, { borderColor: theme.cardBorder }]}
            onPress={() => setScreen('share')}
          >
            <Text style={{ color: theme.text }}>Send Results</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    );
  }

  if (loading && polls.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.pageBg }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (error && polls.length === 0) {
    return <ListError message={error} onRetry={() => void loadPolls()} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.pageBg }]}>
      {canManagePolls ? (
        <Pressable style={[styles.createBar, { backgroundColor: theme.cardBg }]} onPress={() => setScreen('create')}>
          <Text style={[styles.createBarText, { color: theme.accent }]}>+ New Poll</Text>
        </Pressable>
      ) : null}
      <FlatList
        data={polls}
        keyExtractor={(item) => item.pollId}
        contentContainerStyle={styles.listPad}
        ListEmptyComponent={<ListEmpty message="No polls yet." />}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.pollCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
            onPress={() => void openPoll(item.pollId)}
          >
            <Text style={[styles.pollQuestion, { color: theme.text }]}>{item.question}</Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {item.totalVotes} vote{item.totalVotes === 1 ? '' : 's'} · {item.status}
              {item.createdAt ? ` · ${formatWhen(item.createdAt)}` : ''}
            </Text>
            {item.hasVoted ? (
              <Text style={[styles.badge, { color: theme.accent }]}>You voted</Text>
            ) : item.canVote ? (
              <Text style={[styles.badge, { color: theme.accentGold }]}>Tap to vote</Text>
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
  listPad: { padding: 16, gap: 12, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backLink: { fontWeight: '700', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  meta: { fontSize: 13, marginBottom: 8 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  label: { fontSize: 13, fontWeight: '600' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { fontWeight: '700', marginTop: 4 },
  checkRow: { paddingVertical: 8 },
  memberPick: { gap: 8 },
  memberChip: { borderRadius: 12, padding: 12 },
  primaryBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  secondaryBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  createBar: { padding: 14, alignItems: 'center' },
  createBarText: { fontWeight: '800' },
  pollCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  pollQuestion: { fontSize: 16, fontWeight: '700' },
  badge: { marginTop: 6, fontSize: 12, fontWeight: '700' },
  optionCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  optionTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  optionLabel: { flex: 1, fontWeight: '600' },
  barTrack: { marginTop: 8, height: 8, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
});
