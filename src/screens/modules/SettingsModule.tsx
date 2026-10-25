import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import axios from 'axios';
import { ListEmpty, ListError, ListLoading } from '../../components/dashboard/ListStates';
import { ChangePasswordFlow } from '../../components/ChangePasswordFlow';
import {
  addContractType,
  deleteContractType,
  fetchContractTypes,
  fetchMaintenanceSettings,
  fetchSocietyBankDetails,
  updateMaintenanceSettings,
  updateSocietyBankDetails,
} from '../../services/api';
import { BankDetailsCard } from '../../components/payment/MaintenancePayment';
import { useAppAlert } from '../../context/AppAlertContext';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useTheme } from '../../theme/ThemeContext';
import type { MaintenanceSettings } from '../../types/api';

type ServicesSectionKey = 'security' | 'maintenance' | 'payments' | 'contracts';

function ServicesAccordionSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.accordion, { borderColor: theme.divider, backgroundColor: theme.cardBg }]}>
      <Pressable style={styles.accordionHead} onPress={onToggle}>
        <Text style={[styles.accordionTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.accordionChevron, { color: theme.textMuted }]}>{expanded ? '▾' : '▸'}</Text>
      </Pressable>
      {expanded ? <View style={styles.accordionBody}>{children}</View> : null}
    </View>
  );
}

export function SettingsModule() {
  const { theme } = useTheme();
  const { alert, confirm } = useAppAlert();
  const settingsLoad = useAsyncLoad(fetchMaintenanceSettings, []);
  const bankLoad = useAsyncLoad(fetchSocietyBankDetails, []);
  const typesLoad = useAsyncLoad(fetchContractTypes, []);
  const pageLoading =
    (settingsLoad.loading && !settingsLoad.data) ||
    (bankLoad.loading && !bankLoad.data) ||
    (typesLoad.loading && !typesLoad.data);

  const [defaultMaintenance, setDefaultMaintenance] = useState('');
  const [shopMaintenance, setShopMaintenance] = useState('');
  const [penaltyGraceDay, setPenaltyGraceDay] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [allowCustomMaintenance, setAllowCustomMaintenance] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [bankHolder, setBankHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankUpi, setBankUpi] = useState('');
  const [bankInstructions, setBankInstructions] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  const [typeLabel, setTypeLabel] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [addingType, setAddingType] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<ServicesSectionKey, boolean>>({
    security: false,
    maintenance: false,
    payments: false,
    contracts: false,
  });

  function toggleSection(section: ServicesSectionKey) {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  }

  useEffect(() => {
    if (!settingsLoad.data) return;
    const s = settingsLoad.data;
    setDefaultMaintenance(String(s.defaultMaintenanceAmount));
    setShopMaintenance(s.shopMaintenanceAmount ? String(s.shopMaintenanceAmount) : '');
    setPenaltyGraceDay(String(s.maintenancePenaltyGraceDay));
    setPenaltyAmount(String(s.maintenancePenaltyAmount));
    setAllowCustomMaintenance(s.allowCustomMemberMaintenance);
    if (s.configured === false) {
      setExpandedSections((current) => ({ ...current, maintenance: true }));
    }
  }, [settingsLoad.data]);

  useEffect(() => {
    const b = bankLoad.data;
    if (!b) return;
    setBankHolder(b.accountHolderName);
    setBankName(b.bankName);
    setBankBranch(b.bankBranch);
    setBankAccount(b.accountNumber);
    setBankIfsc(b.ifsc);
    setBankUpi(b.upiId);
    setBankInstructions(b.paymentInstructions);
    if (!b.configured && b.canEdit) {
      setExpandedSections((current) => ({ ...current, payments: true }));
    }
  }, [bankLoad.data]);

  const refreshing = settingsLoad.refreshing || bankLoad.refreshing || typesLoad.refreshing;

  function refreshAll() {
    settingsLoad.refresh();
    bankLoad.refresh();
    typesLoad.refresh();
  }

  async function saveSettings() {
    const defaultMaintenanceAmount = Number(defaultMaintenance);
    const maintenancePenaltyGraceDay = Number(penaltyGraceDay);
    const maintenancePenaltyAmount = Number(penaltyAmount);

    if (!Number.isFinite(defaultMaintenanceAmount) || defaultMaintenanceAmount < 1) {
      alert('Invalid value', 'Default monthly maintenance must be at least 1.', { variant: 'error' });
      return;
    }
    const shopMaintenanceAmount = shopMaintenance.trim() ? Number(shopMaintenance) : null;
    if (shopMaintenanceAmount !== null && (!Number.isFinite(shopMaintenanceAmount) || shopMaintenanceAmount < 0)) {
      alert('Invalid value', 'Shop maintenance must be a positive number, or leave it empty.', { variant: 'error' });
      return;
    }
    if (
      !Number.isFinite(maintenancePenaltyGraceDay) ||
      maintenancePenaltyGraceDay < 1 ||
      maintenancePenaltyGraceDay > 31
    ) {
      alert('Invalid value', 'No penalty till day must be between 1 and 31.', { variant: 'error' });
      return;
    }
    if (!Number.isFinite(maintenancePenaltyAmount) || maintenancePenaltyAmount < 0) {
      alert('Invalid value', 'Penalty amount cannot be negative.', { variant: 'error' });
      return;
    }

    const payload: MaintenanceSettings = {
      defaultMaintenanceAmount,
      shopMaintenanceAmount,
      maintenancePenaltyGraceDay: Math.round(maintenancePenaltyGraceDay),
      maintenancePenaltyAmount,
      allowCustomMemberMaintenance: allowCustomMaintenance,
    };

    setSavingSettings(true);
    try {
      await updateMaintenanceSettings(payload);
      alert('Saved', 'Maintenance settings saved.', { variant: 'success' });
      settingsLoad.refresh();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert('Save failed', msg ?? (e instanceof Error ? e.message : 'Unable to save settings'), {
        variant: 'error',
      });
    } finally {
      setSavingSettings(false);
    }
  }

  async function saveBankDetails() {
    if (!bankHolder.trim() || !bankName.trim() || !bankIfsc.trim() || !bankAccount.trim()) {
      alert('Missing details', 'Enter the account holder name, bank name, account number and IFSC.', { variant: 'error' });
      return;
    }
    setSavingBank(true);
    try {
      await updateSocietyBankDetails({
        accountHolderName: bankHolder.trim(),
        bankName: bankName.trim(),
        bankBranch: bankBranch.trim(),
        accountNumber: bankAccount.trim(),
        ifsc: bankIfsc.trim(),
        upiId: bankUpi.trim(),
        paymentInstructions: bankInstructions.trim(),
      });
      alert('Saved', 'Members will now see these bank details when they pay maintenance.', { variant: 'success' });
      bankLoad.refresh();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert('Save failed', msg ?? (e instanceof Error ? e.message : 'Unable to save bank details'), { variant: 'error' });
    } finally {
      setSavingBank(false);
    }
  }

  async function onAddContractType() {
    const label = typeLabel.trim();
    if (label.length < 2) {
      alert('Display name required', 'Enter a display name (e.g. Fire fighting AMC).', { variant: 'error' });
      return;
    }
    setAddingType(true);
    try {
      await addContractType({
        label,
        code: typeCode.trim() ? typeCode.trim() : null,
      });
      alert('Added', 'Contract type added.', { variant: 'success' });
      setTypeLabel('');
      setTypeCode('');
      typesLoad.refresh();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert('Failed', msg ?? (e instanceof Error ? e.message : 'Unable to add contract type'), {
        variant: 'error',
      });
    } finally {
      setAddingType(false);
    }
  }

  function onRemoveContractType(id: string, label: string) {
    confirm({
      title: 'Remove contract type',
      message: `Remove "${label}"?`,
      confirmText: 'Remove',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteContractType(id);
          typesLoad.refresh();
        } catch (e: unknown) {
          const msg = axios.isAxiosError(e)
            ? (e.response?.data as { message?: string } | undefined)?.message
            : undefined;
          alert('Failed', msg ?? 'Unable to remove contract type', { variant: 'error' });
        }
      },
    });
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}
      keyboardShouldPersistTaps="handled"
    >
      {pageLoading ? <ListLoading /> : null}

      {!pageLoading ? (
      <ServicesAccordionSection
        title="Account security"
        expanded={expandedSections.security}
        onToggle={() => toggleSection('security')}
      >
        <ChangePasswordFlow />
      </ServicesAccordionSection>
      ) : null}

      {!pageLoading ? (
      <ServicesAccordionSection
        title="Maintenance Rules & Penalty Settings"
        expanded={expandedSections.maintenance}
        onToggle={() => toggleSection('maintenance')}
      >
        {settingsLoad.error ? <ListError message={settingsLoad.error} /> : null}
        {settingsLoad.data ? (
          <View style={styles.form}>
            <FormField label="Default monthly maintenance (INR)" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={defaultMaintenance}
                onChangeText={setDefaultMaintenance}
                keyboardType="decimal-pad"
                placeholder="1000"
                placeholderTextColor={theme.placeholder}
              />
            </FormField>
            <FormField label="Shop monthly maintenance (INR, optional)" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={shopMaintenance}
                onChangeText={setShopMaintenance}
                keyboardType="decimal-pad"
                placeholder="Same as flats"
                placeholderTextColor={theme.placeholder}
              />
            </FormField>
            <FormField label="No penalty till day" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={penaltyGraceDay}
                onChangeText={setPenaltyGraceDay}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor={theme.placeholder}
              />
            </FormField>
            <FormField label="Penalty amount after grace day (INR)" theme={theme}>
              <TextInput
                style={inputStyle(theme)}
                value={penaltyAmount}
                onChangeText={setPenaltyAmount}
                keyboardType="decimal-pad"
                placeholder="100"
                placeholderTextColor={theme.placeholder}
              />
            </FormField>
            <CheckboxField
              label="Allow different maintenance per member"
              checked={allowCustomMaintenance}
              onChange={setAllowCustomMaintenance}
            />
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: theme.accent }, savingSettings ? styles.disabled : null]}
              onPress={saveSettings}
              disabled={savingSettings}
            >
              <Text style={styles.primaryBtnText}>{savingSettings ? 'Saving…' : 'Save Maintenance'}</Text>
            </Pressable>
          </View>
        ) : null}
      </ServicesAccordionSection>
      ) : null}

      {!pageLoading ? (
      <>
      <ServicesAccordionSection
        title="Bank details for maintenance"
        expanded={expandedSections.payments}
        onToggle={() => toggleSection('payments')}
      >
        {bankLoad.error ? <ListError message={bankLoad.error} /> : null}
        {bankLoad.data && !bankLoad.data.canEdit ? (
          bankLoad.data.configured ? (
            <View style={styles.form}>
              <BankDetailsCard details={bankLoad.data} />
              <Text style={[styles.paymentHint, { color: theme.textMuted }]}>Only the chairman can change these details.</Text>
            </View>
          ) : (
            <Text style={[styles.paymentHint, { color: theme.textMuted }]}>
              The chairman has not added the society's bank details yet.
            </Text>
          )
        ) : null}
        {bankLoad.data?.canEdit ? (
          <View style={styles.form}>
            <Text style={[styles.paymentHint, { color: theme.textMuted }]}>
              Members pay maintenance into this account from their own banking app, then upload a screenshot. You verify
              each payment under Member payments before it is recorded.
            </Text>
            <FormField label="Account holder name" theme={theme}>
              <TextInput style={inputStyle(theme)} value={bankHolder} onChangeText={setBankHolder} placeholder="As per bank records" placeholderTextColor={theme.placeholder} maxLength={128} />
            </FormField>
            <FormField label="Bank name" theme={theme}>
              <TextInput style={inputStyle(theme)} value={bankName} onChangeText={setBankName} placeholder="HDFC Bank" placeholderTextColor={theme.placeholder} maxLength={128} />
            </FormField>
            <FormField label="Branch (optional)" theme={theme}>
              <TextInput style={inputStyle(theme)} value={bankBranch} onChangeText={setBankBranch} placeholder="Andheri West" placeholderTextColor={theme.placeholder} maxLength={128} />
            </FormField>
            <FormField label="Account number" theme={theme}>
              <TextInput style={inputStyle(theme)} value={bankAccount} onChangeText={setBankAccount} placeholder="9 to 18 digits" placeholderTextColor={theme.placeholder} keyboardType="number-pad" maxLength={18} />
            </FormField>
            <FormField label="IFSC code" theme={theme}>
              <TextInput style={inputStyle(theme)} value={bankIfsc} onChangeText={(v) => setBankIfsc(v.toUpperCase())} placeholder="HDFC0001234" placeholderTextColor={theme.placeholder} autoCapitalize="characters" maxLength={11} />
            </FormField>
            <FormField label="UPI ID (optional)" theme={theme}>
              <TextInput style={inputStyle(theme)} value={bankUpi} onChangeText={setBankUpi} placeholder="society@okhdfcbank" placeholderTextColor={theme.placeholder} autoCapitalize="none" autoCorrect={false} maxLength={100} />
            </FormField>
            <FormField label="Instructions for members (optional)" theme={theme}>
              <TextInput
                style={[inputStyle(theme), { minHeight: 70, textAlignVertical: 'top' }]}
                value={bankInstructions}
                onChangeText={setBankInstructions}
                placeholder="e.g. Write your flat number in the payment remarks"
                placeholderTextColor={theme.placeholder}
                multiline
                maxLength={1000}
              />
            </FormField>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: theme.accent }, savingBank ? styles.disabled : null]}
              onPress={() => void saveBankDetails()}
              disabled={savingBank}
            >
              <Text style={styles.primaryBtnText}>{savingBank ? 'Saving…' : 'Save bank details'}</Text>
            </Pressable>
          </View>
        ) : null}
      </ServicesAccordionSection>

      <ServicesAccordionSection
        title="Contract Types"
        expanded={expandedSections.contracts}
        onToggle={() => toggleSection('contracts')}
      >
        {typesLoad.error ? <ListError message={typesLoad.error} /> : null}
        {typesLoad.data?.length === 0 ? <ListEmpty message="No contract types defined." /> : null}
        {typesLoad.data?.map((t) => (
          <View key={t.id} style={[styles.typeRow, { borderTopColor: theme.divider }]}>
            <View style={styles.typeText}>
              <Text style={[styles.typeName, { color: theme.text }]}>{t.label}</Text>
              <Text style={[styles.typeCode, { color: theme.textMuted }]}>{t.code}</Text>
            </View>
            <Pressable onPress={() => onRemoveContractType(t.id, t.label)} hitSlop={8}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))}

        <View style={[styles.addTypeBlock, { borderTopColor: theme.divider }]}>
          <FormField label="Display name" theme={theme}>
            <TextInput
              style={inputStyle(theme)}
              value={typeLabel}
              onChangeText={setTypeLabel}
              placeholder="e.g. Fire fighting AMC"
              placeholderTextColor={theme.placeholder}
            />
          </FormField>
          <FormField label="Code (optional)" theme={theme}>
            <TextInput
              style={inputStyle(theme)}
              value={typeCode}
              onChangeText={setTypeCode}
              placeholder="AUTO if empty"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="characters"
            />
          </FormField>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: theme.accent }, addingType ? styles.disabled : null]}
            onPress={onAddContractType}
            disabled={addingType}
          >
            <Text style={styles.primaryBtnText}>{addingType ? 'Adding…' : 'Add Contract Type'}</Text>
          </Pressable>
        </View>
      </ServicesAccordionSection>
      </>
      ) : null}
    </ScrollView>
  );
}

function FormField({
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
      <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

function inputStyle(theme: ReturnType<typeof useTheme>['theme']) {
  return [
    styles.input,
    {
      borderColor: theme.inputBorder,
      backgroundColor: theme.cardBg,
      color: theme.inputText,
    },
  ];
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      style={styles.checkboxRow}
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View
        style={[
          styles.checkboxBox,
          { borderColor: theme.inputBorder, backgroundColor: theme.cardBg },
          checked ? { backgroundColor: theme.accent, borderColor: theme.accent } : null,
        ]}
      >
        {checked ? <Text style={styles.checkboxTick}>✓</Text> : null}
      </View>
      <Text style={[styles.checkboxLabel, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 32, gap: 12 },
  accordion: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  accordionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  accordionTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  accordionChevron: { fontSize: 16, fontWeight: '700' },
  accordionBody: { paddingHorizontal: 14, paddingBottom: 14 },
  form: { gap: 4 },
  field: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: 6,
  },
  paymentHint: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    marginBottom: 8,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  checkboxLabel: { flex: 1, fontSize: 14, lineHeight: 20 },
  primaryBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  disabled: { opacity: 0.65 },
  linkBtn: { marginTop: 4, paddingVertical: 8, alignItems: 'center' },
  linkBtnText: { fontSize: 14, fontWeight: '600' },
  typeRow: {
    borderTopWidth: 1,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  typeText: { flex: 1, minWidth: 0 },
  typeName: { fontSize: 15, fontWeight: '600' },
  typeCode: { fontSize: 12, marginTop: 2 },
  removeText: { color: '#dc2626', fontWeight: '600', fontSize: 14 },
  addTypeBlock: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
});
