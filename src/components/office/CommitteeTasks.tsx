import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SectionCard } from '../dashboard/SectionCard';
import { ListEmpty, ListError } from '../dashboard/ListStates';
import {
  createTask,
  deleteTask,
  fetchTasks,
  setTaskStatus,
  type CommitteeTask,
  type TaskList,
} from '../../services/officeV23';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { apiErrorMessage } from '../../utils/apiError';

const STATUS: Record<CommitteeTask['status'], { label: string; color: string }> = {
  OPEN: { label: 'To do', color: '#475569' },
  IN_PROGRESS: { label: 'In progress', color: '#b45309' },
  DONE: { label: 'Done', color: '#047857' },
};
const PRIORITY_COLOR: Record<CommitteeTask['priority'], string> = { LOW: '#64748b', NORMAL: '#2563eb', HIGH: '#b91c1c' };

/** v23 committee task list. */
export function CommitteeTasks() {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const [data, setData] = useState<TaskList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'open' | 'mine' | 'done'>('open');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', details: '', assigneeUserId: '', dueDate: '', priority: 'NORMAL' });

  const load = useCallback(async () => {
    try {
      setData(await fetchTasks());
      setError(null);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load tasks'));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<TaskList>, done?: string) {
    setBusy(true);
    try {
      setData(await action());
      if (done) toast(done, 'success');
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  const input = [styles.input, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg, color: theme.inputText }];
  const items = (data?.items ?? []).filter((t) =>
    filter === 'done' ? t.status === 'DONE' : filter === 'mine' ? t.mine && t.status !== 'DONE' : t.status !== 'DONE'
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <SectionCard
        title="Committee tasks"
        subtitle={data ? `${data.open} open${data.overdue ? ` · ${data.overdue} overdue` : ''}` : undefined}
        headerRight={
          data?.canManage && !adding ? (
            <Pressable style={[styles.addBtn, { backgroundColor: theme.accent }]} onPress={() => setAdding(true)}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </Pressable>
          ) : undefined
        }
      >
        {adding && data ? (
          <View style={{ marginBottom: 12 }}>
            <TextInput style={input} value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} placeholder="Task, e.g. Get 3 quotes for painting" placeholderTextColor={theme.placeholder} />
            <TextInput style={[input, { marginTop: 8 }]} value={form.details} onChangeText={(t) => setForm({ ...form, details: t })} placeholder="Details (optional)" placeholderTextColor={theme.placeholder} multiline />
            <Text style={[styles.label, { color: theme.text }]}>Who does it</Text>
            <View style={styles.chips}>
              {[{ userId: '', name: 'Nobody yet', role: '' }, ...data.people].map((p) => (
                <Pressable
                  key={p.userId || 'none'}
                  onPress={() => setForm({ ...form, assigneeUserId: p.userId })}
                  style={[styles.chip, { borderColor: theme.accent, backgroundColor: form.assigneeUserId === p.userId ? theme.accent : 'transparent' }]}
                >
                  <Text style={{ color: form.assigneeUserId === p.userId ? '#fff' : theme.accent, fontWeight: '700' }}>{p.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.label, { color: theme.text }]}>Priority</Text>
            <View style={styles.chips}>
              {(['LOW', 'NORMAL', 'HIGH'] as const).map((p) => (
                <Pressable key={p} onPress={() => setForm({ ...form, priority: p })} style={[styles.chip, { borderColor: PRIORITY_COLOR[p], backgroundColor: form.priority === p ? PRIORITY_COLOR[p] : 'transparent' }]}>
                  <Text style={{ color: form.priority === p ? '#fff' : PRIORITY_COLOR[p], fontWeight: '700' }}>{p.charAt(0) + p.slice(1).toLowerCase()}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.label, { color: theme.text }]}>Due date (optional)</Text>
            <TextInput style={input} value={form.dueDate} onChangeText={(t) => setForm({ ...form, dueDate: t })} placeholder="YYYY-MM-DD" placeholderTextColor={theme.placeholder} />
            <Pressable
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  const r = await createTask({ ...form, assigneeUserId: form.assigneeUserId || null, dueDate: form.dueDate || null });
                  setForm({ title: '', details: '', assigneeUserId: '', dueDate: '', priority: 'NORMAL' });
                  setAdding(false);
                  return r;
                }, 'Task added')
              }
              style={[styles.primary, { backgroundColor: theme.accent }]}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save task</Text>}
            </Pressable>
            <Pressable onPress={() => setAdding(false)} style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={[styles.chips, { marginBottom: 8 }]}>
          {(['open', 'mine', 'done'] as const).map((k) => (
            <Pressable key={k} onPress={() => setFilter(k)} style={[styles.chip, { borderColor: theme.accent, backgroundColor: filter === k ? theme.accent : 'transparent' }]}>
              <Text style={{ color: filter === k ? '#fff' : theme.accent, fontWeight: '700' }}>{k === 'open' ? 'Open' : k === 'mine' ? 'Mine' : 'Done'}</Text>
            </Pressable>
          ))}
        </View>
        {error ? <ListError message={error} onRetry={() => void load()} /> : null}
        {!data && !error ? <ActivityIndicator color={theme.accent} /> : null}
        {data && items.length === 0 ? <ListEmpty message={filter === 'done' ? 'Nothing finished yet.' : 'No open tasks.'} /> : null}
        {items.map((t) => {
          const s = STATUS[t.status];
          const canMove = data?.canManage || t.mine;
          return (
            <View key={t.id} style={[styles.task, { borderColor: t.overdue ? '#b91c1c' : theme.cardBorder }]}>
              <View style={styles.head}>
                <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
                <Text style={[styles.badge, { color: PRIORITY_COLOR[t.priority], borderColor: PRIORITY_COLOR[t.priority] }]}>{t.priority.toLowerCase()}</Text>
              </View>
              {t.details ? <Text style={{ color: theme.textMuted, marginTop: 2 }}>{t.details}</Text> : null}
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                {t.assigneeName ? `For ${t.assigneeName}` : 'Not assigned'}
                {t.dueDate ? ` · due ${t.dueDate}` : ''}
                {t.createdByName ? ` · by ${t.createdByName}` : ''}
              </Text>
              <Text style={{ color: t.overdue ? '#b91c1c' : s.color, fontWeight: '800', marginTop: 4 }}>{t.overdue ? 'Overdue' : s.label}</Text>
              {canMove ? (
                <View style={[styles.chips, { marginTop: 8 }]}>
                  {t.status === 'OPEN' ? (
                    <Pressable disabled={busy} onPress={() => void run(() => setTaskStatus(t.id, 'IN_PROGRESS'))} style={[styles.chip, { borderColor: theme.accent }]}>
                      <Text style={{ color: theme.accent, fontWeight: '700' }}>Start</Text>
                    </Pressable>
                  ) : null}
                  {t.status !== 'DONE' ? (
                    <Pressable disabled={busy} onPress={() => void run(() => setTaskStatus(t.id, 'DONE'), 'Marked done')} style={[styles.chip, { borderColor: '#047857' }]}>
                      <Text style={{ color: '#047857', fontWeight: '700' }}>Done</Text>
                    </Pressable>
                  ) : (
                    <Pressable disabled={busy} onPress={() => void run(() => setTaskStatus(t.id, 'OPEN'))} style={[styles.chip, { borderColor: theme.accent }]}>
                      <Text style={{ color: theme.accent, fontWeight: '700' }}>Reopen</Text>
                    </Pressable>
                  )}
                  {data?.canManage ? (
                    <Pressable
                      disabled={busy}
                      onPress={() =>
                        confirm({
                          title: 'Delete task?',
                          message: t.title,
                          confirmText: 'Delete',
                          destructive: true,
                          onConfirm: () => run(() => deleteTask(t.id), 'Task deleted'),
                        })
                      }
                      style={[styles.chip, { borderColor: '#b91c1c' }]}
                    >
                      <Text style={{ color: '#b91c1c', fontWeight: '700' }}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  addBtnText: { color: '#fff', fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  primary: { marginTop: 14, borderRadius: 14, paddingVertical: 13, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  task: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '800', flex: 1 },
  badge: { fontSize: 11, fontWeight: '800', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
});
