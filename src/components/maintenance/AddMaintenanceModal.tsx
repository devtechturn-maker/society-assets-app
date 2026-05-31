import { useEffect, useState, type ReactNode } from 'react';
import {
  FlatList,
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
import { addMaintenance, fetchMembers, type PaymentType } from '../../services/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useTheme } from '../../theme/ThemeContext';
import type { SocietyMember } from '../../types/api';
import {
  compareYearMonth,
  currentYearMonth,
  isValidIsoDate,
  isValidYearMonth,
  todayIsoDate,
} from '../../utils/dates';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function AddMaintenanceModal({ visible, onClose, onSaved }: Props) {
  const { alert } = useAppAlert();
  const { theme } = useTheme();
  const [members, setMembers] = useState<SocietyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMemberList, setShowMemberList] = useState(false);

  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayIsoDate());
  const [fromMonth, setFromMonth] = useState(currentYearMonth());
  const [toMonth, setToMonth] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('CASH');
  const [description, setDescription] = useState('');

  const selectedMember = members.find((m) => m.id === memberId);

  useEffect(() => {
    if (!visible) return;
    setLoadingMembers(true);
    fetchMembers()
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [visible]);

  function resetForm() {
    setMemberId('');
    setAmount('');
    setExpenseDate(todayIsoDate());
    setFromMonth(currentYearMonth());
    setToMonth('');
    setPaymentType('CASH');
    setDescription('');
    setShowMemberList(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSave() {
    if (!memberId) {
      alert('Member required', 'Please select a member.', { variant: 'error' });
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 1) {
      alert('Amount required', 'Enter an amount of at least ₹1.', { variant: 'error' });
      return;
    }
    if (!isValidYearMonth(fromMonth)) {
      alert('From month', 'Use format YYYY-MM (e.g. 2026-04).', { variant: 'error' });
      return;
    }
    if (toMonth.trim() && !isValidYearMonth(toMonth)) {
      alert('To month', 'Use format YYYY-MM (e.g. 2026-05) or leave empty.', { variant: 'error' });
      return;
    }
    if (toMonth.trim() && compareYearMonth(toMonth.trim(), fromMonth.trim()) < 0) {
      alert('Invalid period', 'To month cannot be before from month.', { variant: 'error' });
      return;
    }
    if (expenseDate.trim() && !isValidIsoDate(expenseDate)) {
      alert('Maintenance date', 'Use format YYYY-MM-DD or leave empty.', { variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      await addMaintenance({
        memberId,
        amount: amountNum,
        description: description.trim(),
        expenseDate: expenseDate.trim() ? expenseDate.trim() : null,
        paymentType,
        maintenanceFromMonth: fromMonth.trim(),
        maintenanceToMonth: toMonth.trim() ? toMonth.trim() : null,
      });
      alert('Success', 'Maintenance added successfully.', { variant: 'success' });
      resetForm();
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert('Could not save', msg ?? (e instanceof Error ? e.message : 'Unable to add maintenance'), {
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
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Add Flat Maintenance</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={[styles.close, { color: theme.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.form}
            nestedScrollEnabled={true}
            scrollEnabled={showMemberList !== true}
          >
            <Field label="Member" theme={theme}>
              <Pressable
                style={[styles.select, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
                onPress={() => setShowMemberList((v) => !v)}
              >
                <Text style={{ color: selectedMember ? theme.inputText : theme.placeholder }}>
                  {selectedMember
                    ? `${selectedMember.name} (${selectedMember.flatNumber})`
                    : 'Select member'}
                </Text>
              </Pressable>
              {showMemberList ? (
                <View style={[styles.memberListWrap, { borderColor: theme.inputBorder }]}>
                  <FlatList
                    data={members}
                    keyExtractor={(m) => m.id}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                    style={styles.memberListScroll}
                    ListEmptyComponent={
                      <Text style={[styles.memberEmpty, { color: theme.textMuted }]}>
                        {loadingMembers ? 'Loading members…' : 'No members found.'}
                      </Text>
                    }
                    renderItem={({ item: m }) => (
                      <Pressable
                        style={[
                          styles.memberItem,
                          { borderBottomColor: theme.divider },
                          memberId === m.id ? { backgroundColor: theme.accentSoft } : null,
                        ]}
                        onPress={() => {
                          setMemberId(m.id);
                          setShowMemberList(false);
                        }}
                      >
                        <Text style={{ color: theme.text, fontWeight: '600' }}>{m.name}</Text>
                        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                          {m.flatNumber} · {m.email}
                        </Text>
                      </Pressable>
                    )}
                  />
                </View>
              ) : null}
            </Field>

            <Field label="Amount (INR)" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="1000"
                placeholderTextColor={theme.placeholder}
              />
            </Field>

            <Field label="Maintenance Date" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={expenseDate}
                onChangeText={setExpenseDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.placeholder}
              />
            </Field>

            <Field label="From Month" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={fromMonth}
                onChangeText={setFromMonth}
                placeholder="YYYY-MM"
                placeholderTextColor={theme.placeholder}
                autoCapitalize="none"
              />
            </Field>

            <Field label="To Month (Optional)" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={toMonth}
                onChangeText={setToMonth}
                placeholder="YYYY-MM"
                placeholderTextColor={theme.placeholder}
                autoCapitalize="none"
              />
            </Field>

            <Field label="Payment Type" theme={theme}>
              <View style={styles.payRow}>
                <PayChip label="Cash" active={paymentType === 'CASH'} onPress={() => setPaymentType('CASH')} theme={theme} />
                <PayChip
                  label="Online"
                  active={paymentType === 'ONLINE'}
                  onPress={() => setPaymentType('ONLINE')}
                  theme={theme}
                />
              </View>
            </Field>

            <Field label="Description" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={description}
                onChangeText={setDescription}
                placeholder="April maintenance"
                placeholderTextColor={theme.placeholder}
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
              <Text style={styles.btnSaveText}>{saving ? 'Saving…' : 'Save Maintenance'}</Text>
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

function PayChip({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <Pressable
      style={[
        styles.payChip,
        { borderColor: theme.inputBorder },
        active ? { backgroundColor: theme.accent, borderColor: theme.accent } : { backgroundColor: theme.inputBg },
      ]}
      onPress={onPress}
    >
      <Text style={{ color: active ? '#fff' : theme.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
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
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  close: { fontSize: 22, padding: 4 },
  form: { paddingHorizontal: 16, paddingBottom: 12 },
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
  select: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  memberListWrap: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 8,
    height: 220,
  },
  memberListScroll: {
    flexGrow: 0,
  },
  memberEmpty: {
    padding: 12,
    fontSize: 14,
  },
  memberItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  payRow: { flexDirection: 'row', gap: 10 },
  payChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
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
