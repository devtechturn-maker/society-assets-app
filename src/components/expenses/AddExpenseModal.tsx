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
import { addExpense, type PaymentType } from '../../services/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useTheme } from '../../theme/ThemeContext';
import { isValidIsoDate, todayIsoDate } from '../../utils/dates';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function AddExpenseModal({ visible, onClose, onSaved }: Props) {
  const { alert } = useAppAlert();
  const { theme } = useTheme();
  const [saving, setSaving] = useState(false);

  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayIsoDate());
  const [paymentType, setPaymentType] = useState<PaymentType>('CASH');
  const [description, setDescription] = useState('');

  function resetForm() {
    setCategory('');
    setAmount('');
    setExpenseDate(todayIsoDate());
    setPaymentType('CASH');
    setDescription('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSave() {
    const cat = category.trim();
    if (cat.length < 2) {
      alert('Category required', 'Enter a category (e.g. ELECTRICITY, REPAIR, SALARY).', { variant: 'error' });
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 1) {
      alert('Amount required', 'Enter an amount of at least ₹1.', { variant: 'error' });
      return;
    }
    if (expenseDate.trim() && !isValidIsoDate(expenseDate)) {
      alert('Expense date', 'Use format YYYY-MM-DD or leave empty.', { variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      await addExpense({
        category: cat.toUpperCase(),
        amount: amountNum,
        description: description.trim(),
        expenseDate: expenseDate.trim() ? expenseDate.trim() : null,
        paymentType,
      });
      alert('Success', 'Expense added successfully.', { variant: 'success' });
      resetForm();
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert('Could not save', msg ?? (e instanceof Error ? e.message : 'Unable to add expense'), {
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
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Add Society Expense</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={[styles.close, { color: theme.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <Field label="Category" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={category}
                onChangeText={setCategory}
                placeholder="ELECTRICITY / REPAIR / SALARY"
                placeholderTextColor={theme.placeholder}
                autoCapitalize="characters"
              />
            </Field>

            <Field label="Amount (INR)" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.placeholder}
              />
            </Field>

            <Field label="Expense Date" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={expenseDate}
                onChangeText={setExpenseDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.placeholder}
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
                style={[inputStyle(theme), styles.descInput]}
                value={description}
                onChangeText={setDescription}
                placeholder="Monthly electricity bill"
                placeholderTextColor={theme.placeholder}
                multiline
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
              <Text style={styles.btnSaveText}>{saving ? 'Saving…' : 'Save Expense'}</Text>
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
  sheetTitle: { fontSize: 18, fontWeight: '700', flex: 1, paddingRight: 8 },
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
  descInput: { minHeight: 72, textAlignVertical: 'top' },
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
