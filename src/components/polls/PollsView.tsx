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
import { closePoll, createPoll, fetchPollDetail, fetchPolls, voteOnPoll } from '../../services/api';
import type { PollDetail, PollSummary } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { ListEmpty, ListError } from '../dashboard/ListStates';
import { apiErrorMessage } from '../../utils/apiError';

const DURATIONS = [
  { label: '1 day', minutes: 1440 },
  { label: '3 days', minutes: 4320 },
  { label: '7 days', minutes: 10080 },
] as const;

/**
 * Society-wide polls: the chairman asks a question with options; every member votes once and sees results when the
 * poll allows. Group polls inside chats work as before.
 */
export function PollsView({ memberPortal, canCreate }: { memberPortal: boolean; canCreate: boolean }) {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const [polls, setPolls] = useState<PollSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<PollDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [duration, setDuration] = useState<number>(4320);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPolls(await fetchPolls(memberPortal));
      setError(null);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load polls'));
    } finally {
      setLoading(false);
    }
  }, [memberPortal]);

  useEffect(() => {
    void load();
  }, [load]);

  async function open(pollId: string) {
    try {
      setActive(await fetchPollDetail(memberPortal, pollId));
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not open the poll'), 'error');
    }
  }

  async function vote(optionId: string) {
    if (!active) return;
    setBusy(true);
    try {
      setActive(await voteOnPoll(active.pollId, optionId));
      toast('Your vote is saved', 'success');
      void load();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not vote'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (question.trim().length < 5) {
      toast('Write the question', 'error');
      return;
    }
    if (opts.length < 2) {
      toast('Add at least two options', 'error');
      return;
    }
    setBusy(true);
    try {
      const created = await createPoll({
        question: question.trim(),
        options: opts,
        allMembers: true,
        memberIds: [],
        expiresInMinutes: duration,
      });
      toast('Poll sent to all members', 'success');
      setCreating(false);
      setQuestion('');
      setOptions(['', '']);
      setActive(created);
      void load();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not create the poll'), 'error');
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (!active) return;
    confirm({
      title: 'Close this poll?',
      message: 'No more votes will be accepted.',
      confirmText: 'Close poll',
      destructive: true,
      onConfirm: async () => {
        try {
          setActive(await closePoll(active.pollId));
          void load();
        } catch (e) {
          toast(apiErrorMessage(e, 'Could not close the poll'), 'error');
        }
      },
    });
  }

  const input = [styles.input, { borderColor: theme.inputBorder, color: theme.inputText, backgroundColor: theme.inputBg }];

  if (creating) {
    return (
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => setCreating(false)}>
          <Text style={{ color: theme.accent, fontWeight: '700' }}>← Back to polls</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>New society poll</Text>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Question, e.g. Should we paint the building this year?"
          placeholderTextColor={theme.placeholder}
          style={[input, { minHeight: 70 }]}
          multiline
          maxLength={300}
        />
        {options.map((o, i) => (
          <TextInput
            key={i}
            value={o}
            onChangeText={(t) => setOptions((rows) => rows.map((r, j) => (j === i ? t : r)))}
            placeholder={`Option ${i + 1}`}
            placeholderTextColor={theme.placeholder}
            style={input}
            maxLength={120}
          />
        ))}
        {options.length < 6 ? (
          <Pressable onPress={() => setOptions((rows) => [...rows, ''])}>
            <Text style={{ color: theme.accent, fontWeight: '700' }}>+ Add option</Text>
          </Pressable>
        ) : null}
        <Text style={{ color: theme.textMuted }}>Voting open for</Text>
        <View style={styles.chips}>
          {DURATIONS.map((d) => {
            const on = d.minutes === duration;
            return (
              <Pressable
                key={d.minutes}
                onPress={() => setDuration(d.minutes)}
                style={[styles.chip, { borderColor: on ? theme.accent : theme.cardBorder, backgroundColor: on ? theme.accentSoft : 'transparent' }]}
              >
                <Text style={{ color: on ? theme.accent : theme.text, fontWeight: '700' }}>{d.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={() => void submit()} disabled={busy} style={[styles.primary, { backgroundColor: theme.accent }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Send poll to all members</Text>}
        </Pressable>
      </ScrollView>
    );
  }

  if (active) {
    const showResults = active.showResults || active.status === 'CLOSED' || !memberPortal;
    const canVote = memberPortal && active.canVote && active.status === 'ACTIVE' && !active.expired;
    return (
      <ScrollView contentContainerStyle={styles.pad}>
        <Pressable onPress={() => setActive(null)}>
          <Text style={{ color: theme.accent, fontWeight: '700' }}>← Back to polls</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{active.question}</Text>
        <Text style={{ color: theme.textMuted }}>
          {active.status === 'CLOSED' || active.expired ? 'Closed' : 'Open'} · {active.totalVotes} vote(s)
          {active.createdByName ? ` · by ${active.createdByName}` : ''}
        </Text>
        {active.options.map((o) => {
          const mine = active.myVoteOptionId === o.optionId;
          return (
            <Pressable
              key={o.optionId}
              disabled={!canVote || busy}
              onPress={() => void vote(o.optionId)}
              style={[styles.option, { borderColor: mine ? theme.accent : theme.cardBorder, backgroundColor: theme.cardBg }]}
            >
              <View style={styles.optionTop}>
                <Text style={{ color: theme.text, fontWeight: mine ? '800' : '600', flex: 1 }}>
                  {o.label}
                  {mine ? '  ✓ your vote' : ''}
                </Text>
                {showResults && o.voteCount !== undefined ? (
                  <Text style={{ color: theme.textMuted }}>
                    {o.voteCount} · {Math.round(o.percentage ?? 0)}%
                  </Text>
                ) : null}
              </View>
              {showResults && o.percentage !== undefined ? (
                <View style={[styles.bar, { backgroundColor: theme.divider }]}>
                  <View style={[styles.barFill, { width: `${Math.min(100, o.percentage ?? 0)}%`, backgroundColor: theme.accent }]} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
        {canVote ? <Text style={{ color: theme.textMuted }}>Tap an option to vote. You can change it while the poll is open.</Text> : null}
        {!memberPortal && canCreate && active.status === 'ACTIVE' ? (
          <Pressable onPress={close} style={[styles.secondary, { borderColor: '#b91c1c' }]}>
            <Text style={{ color: '#b91c1c', fontWeight: '800' }}>Close poll</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pad} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
      {canCreate && !memberPortal ? (
        <Pressable onPress={() => setCreating(true)} style={[styles.primary, { backgroundColor: theme.accent }]}>
          <Text style={styles.primaryText}>+ New society poll</Text>
        </Pressable>
      ) : null}
      {loading ? <ActivityIndicator color={theme.accent} /> : null}
      {error ? <ListError message={error} /> : null}
      {!loading && !error && polls.length === 0 ? <ListEmpty message="No polls yet." /> : null}
      {polls.map((p) => (
        <Pressable
          key={p.pollId}
          onPress={() => void open(p.pollId)}
          style={[styles.card, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}
        >
          <Text style={{ color: theme.text, fontWeight: '700' }}>{p.question}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>
            {p.status === 'CLOSED' || p.expired ? 'Closed' : 'Open'} · {p.totalVotes} vote(s)
            {memberPortal && p.canVote && !p.hasVoted && p.status === 'ACTIVE' ? ' · tap to vote' : ''}
            {p.hasVoted ? ' · you voted' : ''}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 14, gap: 10, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  primary: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', minHeight: 46, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  secondary: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  option: { borderWidth: 1.5, borderRadius: 12, padding: 12, gap: 6 },
  optionTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
});
