import { useState, type ReactNode } from 'react';
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
import { addMember } from '../../services/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useTheme } from '../../theme/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AddMemberModal({ visible, onClose, onSaved }: Props) {
  const { alert } = useAppAlert();
  const { theme } = useTheme();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [customMaintenance, setCustomMaintenance] = useState('');

  function resetForm() {
    setName('');
    setEmail('');
    setFlatNumber('');
    setPhone('');
    setCustomMaintenance('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSave() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFlat = flatNumber.trim().toUpperCase();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 2) {
      alert('Name required', 'Enter the member name.', { variant: 'error' });
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      alert('Email required', 'Enter a valid email address.', { variant: 'error' });
      return;
    }
    if (!trimmedFlat) {
      alert('Flat required', 'Enter a flat number.', { variant: 'error' });
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
      await addMember({
        name: trimmedName,
        email: trimmedEmail,
        flatNumber: trimmedFlat,
        phone: trimmedPhone,
        customMaintenanceAmount,
      });
      alert('Success', 'Member created successfully.', { variant: 'success' });
      resetForm();
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert('Could not save', msg ?? (e instanceof Error ? e.message : 'Unable to create member'), {
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
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Add Member Manually</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={[styles.close, { color: theme.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <Text style={[styles.hint, { color: theme.textMuted }]}>Create one member at a time</Text>

            <Field label="Name" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={name}
                onChangeText={setName}
                placeholder="Ravi Kumar"
                placeholderTextColor={theme.placeholder}
              />
            </Field>

            <Field label="Email" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={email}
                onChangeText={setEmail}
                placeholder="ravi@example.com"
                placeholderTextColor={theme.placeholder}
                autoCapitalize="none"
                keyboardType="email-address"
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
              disabled={saving}
            >
              <Text style={styles.btnSaveText}>{saving ? 'Saving…' : 'Add Member'}</Text>
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
  hint: { fontSize: 13, marginBottom: 12 },
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
