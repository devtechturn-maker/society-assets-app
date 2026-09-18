import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import axios from 'axios';
import { ListEmpty, ListLoading } from '../dashboard/ListStates';
import { addChatGroupMembers, fetchChatGroupMembers, fetchMembers } from '../../services/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useTheme } from '../../theme/ThemeContext';
import type { SocietyMember } from '../../types/api';

type Props = {
  visible: boolean;
  groupId: string;
  groupName: string;
  onClose: () => void;
  onSaved: (memberCount: number) => void;
};

export function EditGroupMembersModal({
  visible,
  groupId,
  groupName,
  onClose,
  onSaved,
}: Props) {
  const { alert } = useAppAlert();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allMembers, setAllMembers] = useState<SocietyMember[]>([]);
  const [currentMemberIds, setCurrentMemberIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setSelected(new Set());
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchMembers(), fetchChatGroupMembers(groupId)])
      .then(([members, groupMembers]) => {
        if (cancelled) return;
        setAllMembers(Array.isArray(members) ? members : []);
        setCurrentMemberIds(new Set((groupMembers ?? []).map((m) => String(m.id))));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Could not load members');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, groupId]);

  const availableMembers = useMemo(
    () => allMembers.filter((member) => !currentMemberIds.has(String(member.id))),
    [allMembers, currentMemberIds]
  );

  const currentMembers = useMemo(
    () => allMembers.filter((member) => currentMemberIds.has(String(member.id))),
    [allMembers, currentMemberIds]
  );

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleClose() {
    if (saving) return;
    onClose();
  }

  async function handleSave() {
    if (selected.size === 0) {
      await alert('Select members', 'Choose at least one member to add to this group.', { variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      const result = await addChatGroupMembers(groupId, [...selected]);
      await alert(
        'Members added',
        `${selected.size} member${selected.size === 1 ? '' : 's'} added to ${groupName}.`,
        { variant: 'success' }
      );
      onSaved(result.memberCount);
      onClose();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      await alert('Could not add members', msg ?? (e instanceof Error ? e.message : 'Try again.'), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: theme.cardBg }]}>
          <View style={[styles.sheetHead, { borderBottomColor: theme.divider }]}>
            <Pressable onPress={handleClose} hitSlop={12} disabled={saving}>
              <Text style={[styles.headAction, { color: theme.textMuted }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.sheetTitle, { color: theme.text }]} numberOfLines={1}>
              Add members
            </Text>
            <Pressable onPress={handleSave} hitSlop={12} disabled={saving || selected.size === 0}>
              {saving ? (
                <ActivityIndicator color={theme.accent} size="small" />
              ) : (
                <Text
                  style={[
                    styles.headAction,
                    styles.headSave,
                    { color: selected.size > 0 ? theme.accent : theme.textMuted },
                  ]}
                >
                  Add
                </Text>
              )}
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {groupName} · {currentMemberIds.size} current member{currentMemberIds.size === 1 ? '' : 's'}
          </Text>

          {currentMembers.length > 0 ? (
            <View style={[styles.currentBlock, { borderColor: theme.cardBorder, backgroundColor: theme.chipBg }]}>
              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Already in group</Text>
              <Text style={[styles.currentList, { color: theme.text }]} numberOfLines={3}>
                {currentMembers.map((m) => m.name).join(', ')}
              </Text>
            </View>
          ) : null}

          {loading ? (
            <ListLoading />
          ) : error ? (
            <Text style={[styles.errorText, { color: '#c0392b' }]}>{error}</Text>
          ) : (
            <FlatList
              data={availableMembers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <ListEmpty message="All society members are already in this group." />
              }
              renderItem={({ item }) => {
                const checked = selected.has(item.id);
                return (
                  <Pressable
                    style={[
                      styles.memberRow,
                      { borderColor: theme.cardBorder, backgroundColor: theme.cardBg },
                      checked ? { backgroundColor: theme.accentSoft, borderColor: theme.chipActiveBorder } : null,
                    ]}
                    onPress={() => toggleMember(item.id)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        { borderColor: theme.inputBorder },
                        checked ? { backgroundColor: theme.accent, borderColor: theme.accent } : null,
                      ]}
                    >
                      {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
                    </View>
                    <View style={styles.memberText}>
                      <Text style={[styles.memberName, { color: theme.text }]}>{item.name}</Text>
                      <Text style={[styles.memberEmail, { color: theme.textMuted }]}>
                        {item.flatNumber ? `${item.flatNumber} · ` : ''}
                        {item.email}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center', paddingHorizontal: 8 },
  headAction: { fontSize: 16, fontWeight: '600', minWidth: 56 },
  headSave: { textAlign: 'right', fontWeight: '800' },
  subtitle: { fontSize: 13, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  currentBlock: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  currentList: { fontSize: 13, lineHeight: 18 },
  list: { paddingHorizontal: 16, paddingBottom: 8 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: { color: '#fff', fontWeight: '800', fontSize: 14 },
  memberText: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 14, fontWeight: '600' },
  memberEmail: { fontSize: 12, marginTop: 2 },
  errorText: { padding: 16, fontSize: 14 },
});
