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
import { createContract, fetchContractTypes } from '../../services/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useTheme } from '../../theme/ThemeContext';
import type { SocietyContractTypeOption } from '../../types/api';
import { compareIsoDate, isValidIsoDate, todayIsoDate } from '../../utils/dates';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function AddContractModal({ visible, onClose, onSaved }: Props) {
  const { alert } = useAppAlert();
  const { theme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [types, setTypes] = useState<SocietyContractTypeOption[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [showTypeList, setShowTypeList] = useState(false);

  const [contractType, setContractType] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [startDate, setStartDate] = useState(todayIsoDate());
  const [endDate, setEndDate] = useState('');
  const [contractValue, setContractValue] = useState('');

  const selectedTypeLabel =
    types.find((t) => t.code === contractType)?.label ?? (contractType || 'Select contract type');

  useEffect(() => {
    if (!visible) return;
    setLoadingTypes(true);
    fetchContractTypes()
      .then((list) => {
        setTypes(list);
        if (list.length > 0) {
          setContractType(list[0].code);
        }
      })
      .catch(() => setTypes([]))
      .finally(() => setLoadingTypes(false));
  }, [visible]);

  function resetForm() {
    setVendorName('');
    setReferenceNote('');
    setStartDate(todayIsoDate());
    setEndDate('');
    setContractValue('');
    setShowTypeList(false);
    if (types.length > 0) {
      setContractType(types[0].code);
    } else {
      setContractType('');
    }
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSave() {
    if (!contractType) {
      alert(
        'Contract type required',
        'Add at least one contract type under Settings first, then try again.',
        { variant: 'warning' }
      );
      return;
    }
    if (!isValidIsoDate(startDate)) {
      alert('Start date', 'Use format YYYY-MM-DD.', { variant: 'error' });
      return;
    }
    if (!isValidIsoDate(endDate)) {
      alert('End date', 'Use format YYYY-MM-DD.', { variant: 'error' });
      return;
    }
    if (compareIsoDate(endDate, startDate) < 0) {
      alert('Invalid dates', 'End date cannot be before start date.', { variant: 'error' });
      return;
    }

    let value: number | null = null;
    if (contractValue.trim()) {
      const n = Number(contractValue);
      if (!Number.isFinite(n) || n <= 0) {
        alert('Contract value', 'Enter a positive amount or leave empty.', { variant: 'error' });
        return;
      }
      value = n;
    }

    setSaving(true);
    try {
      await createContract({
        contractType,
        vendorName: vendorName.trim() || null,
        referenceNote: referenceNote.trim() || null,
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        contractValue: value,
      });
      alert('Success', 'Contract saved.', { variant: 'success' });
      resetForm();
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert('Could not save', msg ?? (e instanceof Error ? e.message : 'Unable to save contract'), {
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
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Add Contract</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={[styles.close, { color: theme.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.form}
            nestedScrollEnabled={true}
            scrollEnabled={showTypeList !== true}
          >
            {types.length === 0 && !loadingTypes ? (
              <Text style={[styles.warn, { color: theme.textMuted }]}>
                No contract types yet. Add types in Settings → Contract Types, then return here.
              </Text>
            ) : null}

            <Field label="Contract Type" theme={theme}>
              <Pressable
                style={[styles.select, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
                onPress={() => types.length > 0 && setShowTypeList((v) => !v)}
                disabled={types.length === 0}
              >
                <Text style={{ color: types.length ? theme.inputText : theme.placeholder }}>
                  {loadingTypes ? 'Loading types…' : selectedTypeLabel}
                </Text>
              </Pressable>
              {showTypeList && types.length > 0 ? (
                <View style={[styles.typeListWrap, { borderColor: theme.inputBorder }]}>
                  <FlatList
                    data={types}
                    keyExtractor={(t) => t.id}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                    style={styles.typeListScroll}
                    renderItem={({ item: t }) => (
                      <Pressable
                        style={[
                          styles.typeItem,
                          { borderBottomColor: theme.divider },
                          contractType === t.code ? { backgroundColor: theme.accentSoft } : null,
                        ]}
                        onPress={() => {
                          setContractType(t.code);
                          setShowTypeList(false);
                        }}
                      >
                        <Text style={{ color: theme.text, fontWeight: '600' }}>{t.label}</Text>
                        <Text style={{ color: theme.textMuted, fontSize: 12 }}>{t.code}</Text>
                      </Pressable>
                    )}
                  />
                </View>
              ) : null}
            </Field>

            <Field label="Vendor (Optional)" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={vendorName}
                onChangeText={setVendorName}
                placeholder="Service provider name"
                placeholderTextColor={theme.placeholder}
              />
            </Field>

            <Field label="Reference / Notes (Optional)" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={referenceNote}
                onChangeText={setReferenceNote}
                placeholder="PO number, SLA, contact"
                placeholderTextColor={theme.placeholder}
              />
            </Field>

            <Field label="Start Date" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.placeholder}
              />
            </Field>

            <Field label="End Date" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.placeholder}
              />
            </Field>

            <Field label="Annual / Contract Value (Optional)" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={contractValue}
                onChangeText={setContractValue}
                placeholder="0"
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
              style={[
                styles.btn,
                styles.btnSave,
                { backgroundColor: theme.accent },
                saving || types.length === 0 ? styles.disabled : null,
              ]}
              onPress={handleSave}
              disabled={saving || types.length === 0}
            >
              <Text style={styles.btnSaveText}>{saving ? 'Saving…' : 'Save'}</Text>
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
  warn: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
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
  typeListWrap: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 8,
    height: 180,
  },
  typeListScroll: { flexGrow: 0 },
  typeItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
