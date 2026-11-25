import { useEffect, useState, type ReactNode } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ModalKeyboardAvoidingView } from '../KeyboardSafeView';
import axios from 'axios';
import { OTHER_INCOME_CATEGORY_OPTIONS } from '../../constants/otherIncomeCategories';
import { addExpense, addOtherIncome, fetchLedgerCategories, type PaymentType } from '../../services/api';
import type { LedgerCategoryOption } from '../../types/api';
import { pickPhotoFromCamera, pickPhotoFromLibrary, showPhotoSourcePicker, type PickedPhoto } from '../../utils/pickPhoto';
import { useAppAlert } from '../../context/AppAlertContext';
import { useTheme } from '../../theme/ThemeContext';
import { isValidIsoDate, todayIsoDate } from '../../utils/dates';
import { FlatNumberSelect } from '../FlatNumberSelect';
import { DateField } from '../form/DateField';

type LedgerEntryType = 'EXPENSE' | 'INCOME';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function AddLedgerEntryModal({ visible, onClose, onSaved }: Props) {
  const { alert } = useAppAlert();
  const { theme } = useTheme();
  const [entryType, setEntryType] = useState<LedgerEntryType | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCategoryList, setShowCategoryList] = useState(false);

  const [expenseCategory, setExpenseCategory] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('TRANSFER_FEES');
  const [customCategory, setCustomCategory] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState(todayIsoDate());
  const [paymentType, setPaymentType] = useState<PaymentType>('CASH');
  const [description, setDescription] = useState('');
  const [payee, setPayee] = useState('');
  const [voucherNo, setVoucherNo] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [bill, setBill] = useState<PickedPhoto | null>(null);
  const [expenseOptions, setExpenseOptions] = useState<LedgerCategoryOption[]>([]);

  useEffect(() => {
    if (!visible) return;
    // Older servers do not have this list; the form still works with typed categories.
    fetchLedgerCategories()
      .then((c) => setExpenseOptions(c.expense))
      .catch(() => setExpenseOptions([]));
  }, [visible]);

  const detailsPayload = {
    payee: payee.trim() || undefined,
    voucherNo: voucherNo.trim() || undefined,
    referenceNo: referenceNo.trim() || undefined,
  };

  function detailsFields(kind: 'EXPENSE' | 'INCOME') {
    return (
      <>
        <Field label={kind === 'EXPENSE' ? 'Paid to (optional)' : 'Received from (optional)'} theme={theme}>
          <TextInput
            style={inputStyle(theme)}
            value={payee}
            onChangeText={setPayee}
            placeholder={kind === 'EXPENSE' ? 'e.g. Shree Electricals' : 'e.g. Hall booking by A-101'}
            placeholderTextColor={theme.placeholder}
            maxLength={120}
          />
        </Field>
        <Field label="Bill / voucher no. (optional)" theme={theme}>
          <TextInput
            style={inputStyle(theme)}
            value={voucherNo}
            onChangeText={setVoucherNo}
            placeholder="e.g. INV-2041"
            placeholderTextColor={theme.placeholder}
            maxLength={40}
          />
        </Field>
        {paymentType === 'ONLINE' ? (
          <Field label="UTR / cheque no. (optional)" theme={theme}>
            <TextInput
              style={inputStyle(theme)}
              value={referenceNo}
              onChangeText={setReferenceNo}
              placeholder="12-digit UTR or cheque number"
              placeholderTextColor={theme.placeholder}
              maxLength={80}
            />
          </Field>
        ) : null}
        <Field label={kind === 'EXPENSE' ? 'Bill photo (optional)' : 'Receipt photo (optional)'} theme={theme}>
          <View style={styles.payRow}>
            {bill ? <Image source={{ uri: bill.uri }} style={styles.billThumb} /> : null}
            <Pressable
              style={[styles.billBtn, { borderColor: theme.inputBorder }]}
              onPress={() =>
                showPhotoSourcePicker(
                  () => void pickPhotoFromCamera().then((p) => p && setBill(p)),
                  () => void pickPhotoFromLibrary().then((p) => p && setBill(p))
                )
              }
            >
              <Text style={{ color: theme.accent, fontWeight: '700' }}>{bill ? 'Change photo' : '+ Add photo'}</Text>
            </Pressable>
            {bill ? (
              <Pressable onPress={() => setBill(null)} style={styles.billBtn}>
                <Text style={{ color: theme.textMuted, fontWeight: '600' }}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        </Field>
      </>
    );
  }

  const selectedIncomeLabel =
    OTHER_INCOME_CATEGORY_OPTIONS.find((o) => o.value === incomeCategory)?.label ?? 'Select category';

  function resetForm() {
    setEntryType(null);
    setExpenseCategory('');
    setIncomeCategory('TRANSFER_FEES');
    setCustomCategory('');
    setFlatNumber('');
    setAmount('');
    setEntryDate(todayIsoDate());
    setPaymentType('CASH');
    setDescription('');
    setShowCategoryList(false);
    setPayee('');
    setVoucherNo('');
    setReferenceNo('');
    setBill(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleBack() {
    setEntryType(null);
    setShowCategoryList(false);
  }

  async function saveExpense() {
    const cat = expenseCategory.trim();
    if (cat.length < 2) {
      alert('Category required', 'Enter a category (e.g. ELECTRICITY, REPAIR, SALARY).', { variant: 'error' });
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 1) {
      alert('Amount required', 'Enter an amount of at least ₹1.', { variant: 'error' });
      return;
    }
    if (entryDate.trim() && !isValidIsoDate(entryDate)) {
      alert('Expense date', 'Use format YYYY-MM-DD or leave empty.', { variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      await addExpense(
        {
          category: cat.toUpperCase(),
          amount: amountNum,
          description: description.trim(),
          expenseDate: entryDate.trim() ? entryDate.trim() : null,
          paymentType,
          ...detailsPayload,
        },
        bill
      );
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

  async function saveIncome() {
    const resolvedCategory =
      incomeCategory === 'OTHER' ? customCategory.trim().toUpperCase() : incomeCategory;
    if (!resolvedCategory) {
      alert('Category required', 'Enter a custom category for Other income.', { variant: 'error' });
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 1) {
      alert('Amount required', 'Enter an amount of at least ₹1.', { variant: 'error' });
      return;
    }
    if (entryDate.trim() && !isValidIsoDate(entryDate)) {
      alert('Income date', 'Use format YYYY-MM-DD or leave empty.', { variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      await addOtherIncome(
        {
          category: resolvedCategory,
          flatNumber: flatNumber.trim() ? flatNumber.trim().toUpperCase() : null,
          amount: amountNum,
          description: description.trim(),
          expenseDate: entryDate.trim() ? entryDate.trim() : null,
          paymentType,
          ...detailsPayload,
        },
        bill
      );
      alert('Success', 'Income added successfully.', { variant: 'success' });
      resetForm();
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert('Could not save', msg ?? (e instanceof Error ? e.message : 'Unable to add income'), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  const title =
    entryType === 'EXPENSE' ? 'Add Expense' : entryType === 'INCOME' ? 'Add Income' : 'Add Entry';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <ModalKeyboardAvoidingView
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: theme.cardBg }]}>
          <View style={styles.sheetHead}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>{title}</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={[styles.close, { color: theme.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          {!entryType ? (
            <View style={styles.typePicker}>
              <Text style={[styles.typeHint, { color: theme.textMuted }]}>
                What would you like to record?
              </Text>
              <View style={styles.typeRow}>
                <Pressable
                  style={[styles.typeBtn, { borderColor: theme.inputBorder, backgroundColor: '#fff7ed' }]}
                  onPress={() => {
                    setPaymentType('CASH');
                    setEntryType('EXPENSE');
                  }}
                >
                  <Text style={[styles.typeBtnLabel, { color: '#c2410c' }]}>Expense</Text>
                  <Text style={[styles.typeBtnSub, { color: theme.textMuted }]}>Repairs, bills, salary…</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeBtn, { borderColor: theme.inputBorder, backgroundColor: '#ecfdf5' }]}
                  onPress={() => {
                    setPaymentType('ONLINE');
                    setEntryType('INCOME');
                  }}
                >
                  <Text style={[styles.typeBtnLabel, { color: '#047857' }]}>Income</Text>
                  <Text style={[styles.typeBtnSub, { color: theme.textMuted }]}>Fees, rent, amenities…</Text>
                </Pressable>
              </View>
              <Pressable
                style={[styles.btn, styles.btnCancel, styles.fullBtn, { borderColor: theme.inputBorder }]}
                onPress={handleClose}
              >
                <Text style={[styles.btnCancelText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
            </View>
          ) : entryType === 'EXPENSE' ? (
            <>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
                <Field label="Category" theme={theme}>
                  {expenseOptions.length > 0 ? (
                    <View style={styles.catChips}>
                      {expenseOptions.map((opt) => {
                        const on = expenseCategory.trim().toUpperCase().replace(/[\s-]+/g, '_') === opt.value;
                        return (
                          <Pressable
                            key={opt.value}
                            onPress={() => setExpenseCategory(opt.value)}
                            style={[
                              styles.catChip,
                              {
                                borderColor: on ? theme.accent : theme.inputBorder,
                                backgroundColor: on ? theme.accentSoft : 'transparent',
                              },
                            ]}
                          >
                            <Text style={{ color: on ? theme.accent : theme.text, fontWeight: '600', fontSize: 13 }}>
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                  <TextInput
                    style={inputStyle(theme)}
                    value={expenseCategory}
                    onChangeText={setExpenseCategory}
                    placeholder={expenseOptions.length > 0 ? 'Or type a new category' : 'ELECTRICITY / REPAIR / SALARY'}
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
                  <DateField
                    style={inputStyle(theme)}
                    value={entryDate}
                    onChangeText={setEntryDate}
                    placeholder="Select date"
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
                {detailsFields('EXPENSE')}
              </ScrollView>

              <View style={styles.actions}>
                <Pressable
                  style={[styles.btn, styles.btnCancel, { borderColor: theme.inputBorder }]}
                  onPress={handleBack}
                  disabled={saving}
                >
                  <Text style={[styles.btnCancelText, { color: theme.text }]}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnSave, { backgroundColor: theme.accent }, saving ? styles.disabled : null]}
                  onPress={saveExpense}
                  disabled={saving}
                >
                  <Text style={styles.btnSaveText}>{saving ? 'Saving…' : 'Save Expense'}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
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
                    <Text style={{ color: theme.inputText }}>{selectedIncomeLabel}</Text>
                  </Pressable>
                  {showCategoryList ? (
                    <View style={[styles.categoryListWrap, { borderColor: theme.inputBorder }]}>
                      <ScrollView
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                        showsVerticalScrollIndicator
                        style={styles.categoryListScroll}
                      >
                        {OTHER_INCOME_CATEGORY_OPTIONS.map((opt) => (
                          <Pressable
                            key={opt.value}
                            style={[
                              styles.categoryItem,
                              { borderBottomColor: theme.divider },
                              incomeCategory === opt.value ? { backgroundColor: theme.accentSoft } : null,
                            ]}
                            onPress={() => {
                              setIncomeCategory(opt.value);
                              setShowCategoryList(false);
                            }}
                          >
                            <Text style={{ color: theme.text, fontSize: 14 }}>{opt.label}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                </Field>

                {incomeCategory === 'OTHER' ? (
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
                  <FlatNumberSelect
                    value={flatNumber}
                    onChange={setFlatNumber}
                    mode="registered"
                    optional
                    placeholder="Select Flat Number"
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
                  <DateField
                    style={inputStyle(theme)}
                    value={entryDate}
                    onChangeText={setEntryDate}
                    placeholder="Select date"
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
                {detailsFields('INCOME')}
              </ScrollView>

              <View style={styles.actions}>
                <Pressable
                  style={[styles.btn, styles.btnCancel, { borderColor: theme.inputBorder }]}
                  onPress={handleBack}
                  disabled={saving}
                >
                  <Text style={[styles.btnCancelText, { color: theme.text }]}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnSave, { backgroundColor: theme.accent }, saving ? styles.disabled : null]}
                  onPress={saveIncome}
                  disabled={saving}
                >
                  <Text style={styles.btnSaveText}>{saving ? 'Saving…' : 'Save Income'}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ModalKeyboardAvoidingView>
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
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
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
  typePicker: { paddingHorizontal: 16, paddingBottom: 16 },
  typeHint: { fontSize: 15, marginBottom: 16, textAlign: 'center' },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  typeBtnLabel: { fontSize: 17, fontWeight: '700' },
  typeBtnSub: { fontSize: 12, textAlign: 'center' },
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
  payRow: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  catChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1 },
  billThumb: { width: 56, height: 56, borderRadius: 8 },
  billBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
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
  fullBtn: { flex: undefined, width: '100%' },
  btnCancel: { borderWidth: 1 },
  btnCancelText: { fontWeight: '700', fontSize: 14 },
  btnSave: {},
  btnSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.65 },
});
