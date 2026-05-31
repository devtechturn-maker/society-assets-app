import { useState, type ReactNode } from 'react';
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
import { OTHER_INCOME_CATEGORY_OPTIONS } from '../../constants/otherIncomeCategories';
import { addOtherIncome, type PaymentType } from '../../services/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useTheme } from '../../theme/ThemeContext';
import { isValidIsoDate, todayIsoDate } from '../../utils/dates';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function AddOtherIncomeModal({ visible, onClose, onSaved }: Props) {
  const { alert } = useAppAlert();
  const { theme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [showCategoryList, setShowCategoryList] = useState(false);

  const [category, setCategory] = useState('TRANSFER_FEES');
  const [customCategory, setCustomCategory] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayIsoDate());
  const [paymentType, setPaymentType] = useState<PaymentType>('ONLINE');
  const [description, setDescription] = useState('');

  const selectedLabel =
    OTHER_INCOME_CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? 'Select category';

  function resetForm() {
    setCategory('TRANSFER_FEES');
    setCustomCategory('');
    setFlatNumber('');
    setAmount('');
    setExpenseDate(todayIsoDate());
    setPaymentType('ONLINE');
    setDescription('');
    setShowCategoryList(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSave() {
    const resolvedCategory =
      category === 'OTHER' ? customCategory.trim().toUpperCase() : category;
    if (!resolvedCategory) {
      alert('Category required', 'Enter a custom category for Other income.', { variant: 'error' });
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 1) {
      alert('Amount required', 'Enter an amount of at least ₹1.', { variant: 'error' });
      return;
    }
    if (expenseDate.trim() && !isValidIsoDate(expenseDate)) {
      alert('Income date', 'Use format YYYY-MM-DD or leave empty.', { variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      await addOtherIncome({
        category: resolvedCategory,
        flatNumber: flatNumber.trim() ? flatNumber.trim().toUpperCase() : null,
        amount: amountNum,
        description: description.trim(),
        expenseDate: expenseDate.trim() ? expenseDate.trim() : null,
        paymentType,
      });
      alert('Success', 'Other income added successfully.', { variant: 'success' });
      resetForm();
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert('Could not save', msg ?? (e instanceof Error ? e.message : 'Unable to add other income'), {
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
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Add Other Income</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={[styles.close, { color: theme.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.form}
            nestedScrollEnabled={true}
            scrollEnabled={showCategoryList !== true}
          >
            <Field label="Income Category" theme={theme}>
              <Pressable
                style={[styles.select, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
                onPress={() => setShowCategoryList((v) => !v)}
              >
                <Text style={{ color: theme.inputText }}>{selectedLabel}</Text>
              </Pressable>
              {showCategoryList ? (
                <View style={[styles.categoryListWrap, { borderColor: theme.inputBorder }]}>
                  <FlatList
                    data={OTHER_INCOME_CATEGORY_OPTIONS}
                    keyExtractor={(o) => o.value}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                    style={styles.categoryListScroll}
                    renderItem={({ item: opt }) => (
                      <Pressable
                        style={[
                          styles.categoryItem,
                          { borderBottomColor: theme.divider },
                          category === opt.value ? { backgroundColor: theme.accentSoft } : null,
                        ]}
                        onPress={() => {
                          setCategory(opt.value);
                          setShowCategoryList(false);
                        }}
                      >
                        <Text style={{ color: theme.text, fontSize: 14 }}>{opt.label}</Text>
                      </Pressable>
                    )}
                  />
                </View>
              ) : null}
            </Field>

            {category === 'OTHER' ? (
              <Field label="Custom Category" theme={theme}>
                <TextInput
                  style={inputStyle(theme)}
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  placeholder="AMENITIES / PARKING / HALL_RENT etc."
                  placeholderTextColor={theme.placeholder}
                  autoCapitalize="characters"
                />
              </Field>
            ) : null}

            <Field label="Flat Number (Optional)" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={flatNumber}
                onChangeText={setFlatNumber}
                placeholder="e.g. A-101 for transfer fees"
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

            <Field label="Income Date" theme={theme}>
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
                placeholder="Short note (invoice no., period, etc.)"
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
              <Text style={styles.btnSaveText}>{saving ? 'Saving…' : 'Save Income'}</Text>
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
  select: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  categoryListWrap: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 8,
    height: 200,
  },
  categoryListScroll: { flexGrow: 0 },
  categoryItem: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
