import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ModalKeyboardAvoidingView } from '../../components/KeyboardSafeView';
import { ListEmpty, ListError } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { DirectoryAddButton, DirectoryListItem } from '../../components/directory/DirectoryListItem';
import { useAppAlert } from '../../context/AppAlertContext';
import {
  addHouseholdLogin,
  fetchMyHousehold,
  removeHouseholdLogin,
  type MyHousehold,
  createMemberFamilyMember,
  deleteMemberFamilyMember,
  fetchMemberFamilyMembers,
  updateMemberFamilyMember,
} from '../../services/api';
import type { FamilyMemberPayload, FamilyRelationship, MemberFamilyMember } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { DirectorySectionShell } from './DirectoryHubModule';
import { apiErrorMessage } from '../../utils/apiError';
import { PhoneInput } from '../../components/form/PhoneInput';

const RELATIONSHIPS: { value: FamilyRelationship; label: string }[] = [
  { value: 'SPOUSE', label: 'Spouse' },
  { value: 'CHILD', label: 'Child' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'OTHER', label: 'Other' },
];

function relationshipLabel(value: FamilyRelationship): string {
  return RELATIONSHIPS.find((item) => item.value === value)?.label ?? value;
}

function FamilyMemberFormModal({
  visible,
  initial,
  onClose,
  onSaved,
}: {
  visible: boolean;
  initial?: MemberFamilyMember | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<FamilyRelationship>('SPOUSE');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [adult, setAdult] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(initial?.name ?? '');
    setRelationship(initial?.relationship ?? 'SPOUSE');
    setPhone(initial?.phone ?? '');
    setAge(initial?.age != null ? String(initial.age) : '');
    setAdult(initial?.adult ?? true);
  }, [visible, initial]);

  async function handleSave() {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast('Enter a valid name', 'error');
      return;
    }
    const payload: FamilyMemberPayload = {
      name: trimmedName,
      relationship,
      phone: phone.trim() || undefined,
      age: age.trim() ? Number(age) : undefined,
      adult,
    };
    if (payload.age != null && (!Number.isFinite(payload.age) || payload.age < 0 || payload.age > 120)) {
      toast('Enter a valid age', 'error');
      return;
    }
    setSaving(true);
    try {
      if (initial) {
        await updateMemberFamilyMember(initial.id, payload);
        toast('Family member updated', 'success');
      } else {
        await createMemberFamilyMember(payload);
        toast('Family member added', 'success');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <ModalKeyboardAvoidingView
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            {initial ? 'Edit family member' : 'Add family member'}
          </Text>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalForm}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={theme.placeholder}
              style={[styles.input, { color: theme.inputText, borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
            />
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Relationship</Text>
            <View style={styles.chipRow}>
              {RELATIONSHIPS.map((item) => {
                const active = relationship === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setRelationship(item.value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.chipActiveBg : theme.chipBg,
                        borderColor: active ? theme.chipActiveBorder : theme.chipBorder,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? theme.accent : theme.text, fontWeight: '600', fontSize: 12 }}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Phone (optional)</Text>
            <PhoneInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Mobile number"
              placeholderTextColor={theme.placeholder}
              style={[styles.input, { color: theme.inputText, borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
            />
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Age (optional)</Text>
            <TextInput
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              placeholder="Age in years"
              placeholderTextColor={theme.placeholder}
              style={[styles.input, { color: theme.inputText, borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
            />
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>Adult</Text>
              <Switch value={adult} onValueChange={setAdult} trackColor={{ true: theme.accent }} />
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={[styles.secondaryBtn, { borderColor: theme.cardBorder }]}>
              <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleSave()}
              disabled={saving}
              style={[styles.primaryBtn, { backgroundColor: theme.accent, opacity: saving ? 0.7 : 1 }]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{initial ? 'Save' : 'Add'}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ModalKeyboardAvoidingView>
    </Modal>
  );
}

/** v21: owner (or tenant, for the rental) gives family members their own sign-in for this flat. */
function FamilyLoginsCard() {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const [data, setData] = useState<MyHousehold | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await fetchMyHousehold());
    } catch {
      setData(null); // older server or no flat: hide the card
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) return null;
  if (!data.canManage) {
    return data.isFamily ? (
      <SectionCard title="Family login" subtitle="You sign in as a family member of this flat">
        <Text style={{ color: theme.textMuted, fontSize: 13, lineHeight: 19 }}>
          You can see notices, visitors, complaints and dues, and pay maintenance. Only the flat owner or tenant can
          vote in polls or change family logins.
        </Text>
      </SectionCard>
    ) : null;
  }

  async function add() {
    const n = name.trim();
    const e = email.trim();
    if (n.length < 2) return toast('Enter a valid name', 'error');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return toast('Enter a valid email', 'error');
    setSaving(true);
    try {
      await addHouseholdLogin({ name: n, email: e, relationship: relationship.trim() || undefined });
      toast(`${n} can now sign in with ${e}`, 'success');
      setName('');
      setEmail('');
      setRelationship('');
      await load();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not add'), 'error');
    } finally {
      setSaving(false);
    }
  }

  function remove(id: string, who: string) {
    confirm({
      title: 'Remove family login?',
      message: `${who} will no longer be able to sign in for this flat.`,
      confirmText: 'Remove',
      destructive: true,
      onConfirm: async () => {
        try {
          await removeHouseholdLogin(id);
          toast('Family login removed', 'success');
          await load();
        } catch (err) {
          toast(apiErrorMessage(err, 'Remove failed'), 'error');
        }
      },
    });
  }

  const full = data.members.length >= data.limit;
  const inputStyle = [styles.input, { color: theme.inputText, borderColor: theme.inputBorder, backgroundColor: theme.inputBg }];
  return (
    <SectionCard
      title="Family logins"
      subtitle={
        data.household === 'TENANT'
          ? `Up to ${data.limit} people can sign in for your rental. Access ends when the rental ends.`
          : `Up to ${data.limit} people can sign in with their own email for this flat.`
      }
    >
      {data.members.map((m) => (
        <DirectoryListItem
          key={m.id}
          title={m.name}
          meta={[m.relationship, m.email].filter(Boolean).join(' · ')}
          avatarIcon="family"
          onDelete={() => remove(m.id, m.name)}
        />
      ))}
      {full ? (
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>You have added the most family logins allowed.</Text>
      ) : (
        <View style={{ gap: 6, marginTop: 6 }}>
          <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={theme.placeholder} style={inputStyle} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email (they sign in with a code)"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={theme.placeholder}
            style={inputStyle}
          />
          <TextInput
            value={relationship}
            onChangeText={setRelationship}
            placeholder="Relationship (optional)"
            placeholderTextColor={theme.placeholder}
            style={inputStyle}
          />
          <Pressable
            disabled={saving}
            onPress={() => void add()}
            style={[styles.primaryBtn, { flex: 0, backgroundColor: theme.accent, opacity: saving ? 0.6 : 1 }]}
          >
            <Text style={styles.primaryBtnText}>{saving ? 'Adding…' : 'Give family login'}</Text>
          </Pressable>
          <Text style={{ color: theme.textMuted, fontSize: 12, lineHeight: 17 }}>
            Family can see notices, visitors, complaints and dues and pay maintenance. They cannot vote in polls or
            change family logins.
          </Text>
        </View>
      )}
    </SectionCard>
  );
}

export function DirectoryFamilyMembersModule({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const [items, setItems] = useState<MemberFamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MemberFamilyMember | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setItems(await fetchMemberFamilyMembers());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load family members');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(item: MemberFamilyMember) {
    setEditing(item);
    setModalOpen(true);
  }

  function removeItem(item: MemberFamilyMember) {
    confirm({
      title: 'Remove family member?',
      message: `Remove ${item.name} from your family list?`,
      confirmText: 'Remove',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteMemberFamilyMember(item.id);
          toast('Family member removed', 'success');
          await load(true);
        } catch (e) {
          toast(e instanceof Error ? e.message : 'Remove failed', 'error');
        }
      },
    });
  }

  return (
    <DirectorySectionShell title="Family Members" onBack={onBack}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
      >
        <FamilyLoginsCard />
        <SectionCard
          title="Your household"
          subtitle="Add family members living in your flat for society records and gate access"
          headerRight={<DirectoryAddButton onPress={openAdd} label="Add family member" />}
        >
          {loading ? <ActivityIndicator color={theme.accent} /> : null}
          {error ? <ListError message={error} onRetry={() => void load()} /> : null}
          {!loading && !error && items.length === 0 ? (
            <ListEmpty
              icon="family"
              title="No family members added yet"
              subtitle="Tap + to add people living in your flat."
            />
          ) : null}
          {items.map((item) => (
            <DirectoryListItem
              key={item.id}
              title={item.name}
              meta={[
                relationshipLabel(item.relationship),
                item.age != null ? `Age ${item.age}` : null,
                item.adult ? 'Adult' : 'Child',
              ]
                .filter(Boolean)
                .join(' · ')}
              secondaryMeta={item.phone}
              avatarIcon="family"
              onPress={() => openEdit(item)}
              onDelete={() => removeItem(item)}
            />
          ))}
        </SectionCard>
      </ScrollView>

      <FamilyMemberFormModal
        visible={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load(true)}
      />
    </DirectorySectionShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 28 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    maxHeight: '88%',
    flexShrink: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 14 },
  modalScroll: { flexShrink: 1 },
  modalForm: { paddingBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
