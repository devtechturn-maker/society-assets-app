import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { ListEmpty, ListError } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { DirectoryAddButton, DirectoryListItem } from '../../components/directory/DirectoryListItem';
import { useAppAlert } from '../../context/AppAlertContext';
import {
  createMemberFamilyMember,
  deleteMemberFamilyMember,
  fetchMemberFamilyMembers,
  updateMemberFamilyMember,
} from '../../services/api';
import type { FamilyMemberPayload, FamilyRelationship, MemberFamilyMember } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { DirectorySectionShell } from './DirectoryHubModule';

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
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
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
      </KeyboardAvoidingView>
    </Modal>
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
    ...StyleSheet.absoluteFillObject,
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
