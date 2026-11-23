import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { addTeamMember, changeTeamRole, fetchOfficeTeam, setTeamMemberActive } from '../../services/api';
import type { OfficeTeam, TeamMember } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { ListError } from '../dashboard/ListStates';
import { apiErrorMessage } from '../../utils/apiError';

/**
 * Office team: the chairman adds a treasurer, committee member or auditor by email (they sign in with a code sent to
 * that email; no password is shared), changes their role, or removes them.
 */
export function TeamSection() {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const [team, setTeam] = useState<OfficeTeam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('USER');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchOfficeTeam()
      .then((t) => (setTeam(t), setError(null)))
      .catch((e) => setError(apiErrorMessage(e, 'Could not load the team')));
  }, []);

  useEffect(load, [load]);

  async function add() {
    if (name.trim().length < 2 || !email.includes('@')) {
      toast('Enter a name and a valid email', 'error');
      return;
    }
    setBusy(true);
    try {
      setTeam(await addTeamMember({ name: name.trim(), email: email.trim(), role }));
      toast('Added. Tell them to sign in with this email; they will get a code.', 'success');
      setName('');
      setEmail('');
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not add'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(m: TeamMember, next: string) {
    try {
      setTeam(await changeTeamRole(m.userId, next));
      setEditing(null);
      toast('Role changed', 'success');
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not change the role'), 'error');
    }
  }

  function toggle(m: TeamMember) {
    confirm({
      title: m.active ? `Remove ${m.name}?` : `Restore ${m.name}?`,
      message: m.active ? 'They will be signed out and cannot use the office screens.' : 'They can sign in again.',
      confirmText: m.active ? 'Remove' : 'Restore',
      destructive: m.active,
      onConfirm: async () => {
        try {
          setTeam(await setTeamMemberActive(m.userId, !m.active));
        } catch (e) {
          toast(apiErrorMessage(e, 'Could not update'), 'error');
        }
      },
    });
  }

  if (error) return <ListError message={error} />;
  if (!team) return <ActivityIndicator color={theme.accent} />;

  const input = [styles.input, { borderColor: theme.inputBorder, color: theme.inputText, backgroundColor: theme.inputBg }];
  return (
    <View style={styles.gap}>
      {team.members.map((m) => (
        <View key={m.userId} style={[styles.row, { borderColor: theme.divider, opacity: m.active ? 1 : 0.6 }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>
              {m.name}
              {m.isMe ? ' (you)' : ''}
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>
              {m.roleLabel} · {m.email}
              {!m.active ? ' · removed' : m.invitePending ? ' · not signed in yet' : ''}
            </Text>
            {editing === m.userId ? (
              <View style={styles.chips}>
                {team.roles.map((r) => (
                  <Pressable
                    key={r.value}
                    onPress={() => void changeRole(m, r.value)}
                    style={[styles.chip, { borderColor: r.value === m.role ? theme.accent : theme.cardBorder }]}
                  >
                    <Text style={{ color: r.value === m.role ? theme.accent : theme.text, fontWeight: '700', fontSize: 12 }}>{r.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          {team.canManage && m.role !== 'CHAIRMAN' && !m.isMe ? (
            <View style={styles.actions}>
              {m.active ? (
                <Pressable onPress={() => setEditing(editing === m.userId ? null : m.userId)}>
                  <Text style={{ color: theme.accent, fontWeight: '700' }}>Role</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => toggle(m)}>
                <Text style={{ color: m.active ? '#b91c1c' : theme.accent, fontWeight: '700' }}>{m.active ? 'Remove' : 'Restore'}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}

      {team.canManage ? (
        <View style={styles.gap}>
          <Text style={{ color: theme.text, fontWeight: '800', marginTop: 8 }}>Add to the office team</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={theme.placeholder} style={input} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email (they sign in with a code sent here)"
            placeholderTextColor={theme.placeholder}
            style={input}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <View style={styles.chips}>
            {team.roles.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => setRole(r.value)}
                style={[styles.chip, { borderColor: role === r.value ? theme.accent : theme.cardBorder, backgroundColor: role === r.value ? theme.accentSoft : 'transparent' }]}
              >
                <Text style={{ color: role === r.value ? theme.accent : theme.text, fontWeight: '700' }}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            Treasurer and committee can record accounts, complaints and notices. Auditors can only view.
          </Text>
          <Pressable onPress={() => void add()} disabled={busy} style={[styles.btn, { backgroundColor: theme.accent }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Add</Text>}
          </Pressable>
        </View>
      ) : (
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>Only the chairman can change the office team.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 8 },
  row: { flexDirection: 'row', gap: 10, borderTopWidth: 1, paddingVertical: 10 },
  actions: { gap: 10, alignItems: 'flex-end', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  btn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
});
