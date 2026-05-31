import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import axios from 'axios';
import { updateMember } from '../../services/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useTheme } from '../../theme/ThemeContext';
import type { SocietyMember } from '../../types/api';

type Props = {
  visible: boolean;
  member: SocietyMember | null;
  onClose: () => void;
  onSaved: () => void;
};

const PHONE_RE = /^\d{10}$/;

export function EditMemberModal({ visible, member, onClose, onSaved }: Props) {
  const { alert } = useAppAlert();
  const { theme } = useTheme();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [customMaintenance, setCustomMaintenance] = useState('');

  useEffect(() => {
    if (!member) {
      return;
    }
    setName(member.name);
    setFlatNumber(member.flatNumber);
    setPhone(member.phone ?? '');
    setCustomMaintenance(
      member.customMaintenanceAmount && member.customMaintenanceAmount > 0
        ? String(member.customMaintenanceAmount)
        : ''
    );
  }, [member]);

  function handleClose() {
    onClose();
  }

  async function handleSave() {
    if (!member) {
      return;
    }
    const trimmedName = name.trim();
    const trimmedFlat = flatNumber.trim().toUpperCase();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 2) {
      alert('Name required', 'Enter the member name.', { variant: 'error' });
      return;
    }
    if (!trimmedFlat) {
      alert('Flat required', 'Enter a flat number.', { variant: 'error' });
      return;
    }
    if (trimmedPhone && !PHONE_RE.test(trimmedPhone)) {
      alert('Phone', 'Mobile number must be exactly 10 digits or left empty.', { variant: 'error' });
      return;
    }

    let customMaintenanceAmount: number | null = null;
    if (customMaintenance.trim()) {
      const n = Number(customMaintenance);
      if (!Number.isFinite(n) || n <= 0) {
        alert('Custom maintenance', 'Enter a positive amount or leave empty.', { variant: 'error' });
        return;
      }
      customMaintenanceAmount = n;
    }

    setSaving(true);
    try {
      await updateMember(member.id, {
        name: trimmedName,
        flatNumber: trimmedFlat,
        phone: trimmedPhone,
        customMaintenanceAmount,
      });
      alert('Success', 'Member updated successfully.', { variant: 'success' });
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert('Could not save', msg ?? (e instanceof Error ? e.message : 'Unable to update member'), {
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
          <View style={styles.sheetHead}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Edit Member</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={[styles.close, { color: theme.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            {member ? (
              <>
                <Field label="Email" theme={theme}>
                  <TextInput
                    style={[inputStyle(theme), styles.readonly]}
                    value={member.email}
                    editable={false}
                  />
                  <Text style={[styles.hint, { color: theme.textMuted }]}>
                    Email cannot be changed after registration.
                  </Text>
                </Field>

                <Field label="Name" theme={theme}>
                  <TextInput
                    style={inputStyle(theme)}
                    value={name}
                    onChangeText={setName}
                    placeholder="Ravi Kumar"
                    placeholderTextColor={theme.placeholder}
                  />
                </Field>

                <Field label="Flat Number" theme={theme}>
                  <TextInput
                    style={inputStyle(theme)}
                    value={flatNumber}
                    onChangeText={setFlatNumber}
                    placeholder="B-204"
                    placeholderTextColor={theme.placeholder}
                    autoCapitalize="characters"
                  />
                </Field>

                <Field label="Phone" theme={theme}>
                  <TextInput
                    style={inputStyle(theme)}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="9876543210"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </Field>

                <Field label="Custom Maintenance (Optional)" theme={theme}>
                  <TextInput
                    style={inputStyle(theme)}
                    value={customMaintenance}
                    onChangeText={setCustomMaintenance}
                    placeholder="1500"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="decimal-pad"
                  />
                </Field>
              </>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnCancel, { borderColor: theme.inputBorder }]}
              onPress={handleClose}
              disabled={saving}
            >
              <Text style={[styles.btnCancelText, { color: theme.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnSave, { backgroundColor: theme.accent }, saving ? styles.disabled : null]}
              onPress={handleSave}
              disabled={saving || !member}
            >
              <Text style={styles.btnSaveText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  theme,
  children,
}: {
  label: string;
  theme: ReturnType<typeof useTheme>['theme'];
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

function inputStyle(theme: ReturnType<typeof useTheme>['theme']) {
  return [
    styles.input,
    {
      borderColor: theme.inputBorder,
      backgroundColor: theme.inputBg,
      color: theme.inputText,
    },
  ];
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', flex: 1, paddingRight: 8 },
  close: { fontSize: 22, padding: 4 },
  form: { paddingHorizontal: 16, paddingBottom: 12 },
  hint: { fontSize: 12, marginTop: 6 },
  field: { marginBottom: 14 },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  readonly: { opacity: 0.75 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnCancel: { borderWidth: 1 },
  btnCancelText: { fontWeight: '700', fontSize: 14 },
  btnSave: {},
  btnSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.65 },
});
