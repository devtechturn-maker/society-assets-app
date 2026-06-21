import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import axios from 'axios';
import { ListEmpty, ListError, ListLoading } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { ChangePasswordFlow } from '../../components/ChangePasswordFlow';
import {
  addContractType,
  deleteContractType,
  fetchContractTypes,
  fetchMaintenanceSettings,
  fetchMemberPaymentSettings,
  requestMemberPaymentSetupOtp,
  updateMaintenanceSettings,
  updateMemberPaymentSettings,
  verifyMemberPaymentSetupOtp,
} from '../../services/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useScreenCaptureSettings } from '../../context/ScreenCaptureContext';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useTheme } from '../../theme/ThemeContext';
import type { MaintenanceSettings } from '../../types/api';

export function SettingsModule() {
  const { theme } = useTheme();
  const { alert, confirm } = useAppAlert();
  const { allowScreenCapture, setAllowScreenCapture } = useScreenCaptureSettings();
  const settingsLoad = useAsyncLoad(fetchMaintenanceSettings, []);
  const paymentSettingsLoad = useAsyncLoad(fetchMemberPaymentSettings, []);
  const typesLoad = useAsyncLoad(fetchContractTypes, []);

  const [defaultMaintenance, setDefaultMaintenance] = useState('');
  const [penaltyGraceDay, setPenaltyGraceDay] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [allowCustomMaintenance, setAllowCustomMaintenance] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [memberPaymentsEnabled, setMemberPaymentsEnabled] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);

  const [chairmanPhone, setChairmanPhone] = useState('');
  const [societyPan, setSocietyPan] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankBeneficiaryName, setBankBeneficiaryName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [routeTncAccepted, setRouteTncAccepted] = useState(false);
  const [paymentSetupStep, setPaymentSetupStep] = useState<'form' | 'otp'>('form');
  const [paymentSetupEmail, setPaymentSetupEmail] = useState('');
  const [setupOtp, setSetupOtp] = useState('');

  const [typeLabel, setTypeLabel] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [addingType, setAddingType] = useState(false);

  useEffect(() => {
    if (!settingsLoad.data) return;
    const s = settingsLoad.data;
    setDefaultMaintenance(String(s.defaultMaintenanceAmount));
    setPenaltyGraceDay(String(s.maintenancePenaltyGraceDay));
    setPenaltyAmount(String(s.maintenancePenaltyAmount));
    setAllowCustomMaintenance(s.allowCustomMemberMaintenance);
  }, [settingsLoad.data]);

  useEffect(() => {
    if (!paymentSettingsLoad.data) return;
    setMemberPaymentsEnabled(paymentSettingsLoad.data.enabled);
    setRazorpayKeyId(paymentSettingsLoad.data.keyId ?? '');
    setRazorpayKeySecret('');
    setBankIfsc(paymentSettingsLoad.data.bankIfsc ?? '');
    setBankBeneficiaryName(paymentSettingsLoad.data.bankBeneficiaryName ?? '');
  }, [paymentSettingsLoad.data]);

  const refreshing = settingsLoad.refreshing || paymentSettingsLoad.refreshing || typesLoad.refreshing;

  function refreshAll() {
    settingsLoad.refresh();
    paymentSettingsLoad.refresh();
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

  function buildBankSetupPayload() {
    return {
      routeTncAccepted,
      chairmanPhone: chairmanPhone.trim(),
      societyPan: societyPan.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankIfsc: bankIfsc.trim(),
      bankBeneficiaryName: bankBeneficiaryName.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
    };
  }

  async function savePaymentSettings() {
    const paymentData = paymentSettingsLoad.data;
    const routeEnabled = paymentData?.routeEnabled === true;

    if (routeEnabled) {
      if (paymentSetupStep === 'otp') {
        const otp = setupOtp.trim();
        if (!/^\d{6}$/.test(otp)) {
          alert('Invalid code', 'Enter the 6-digit verification code from your email.', { variant: 'error' });
          return;
        }
        setSavingPaymentSettings(true);
        try {
          const result = await verifyMemberPaymentSetupOtp(otp);
          alert('Saved', result.message ?? 'Bank account submitted to Razorpay.', { variant: 'success' });
          setPaymentSetupStep('form');
          setSetupOtp('');
          setBankAccountNumber('');
          paymentSettingsLoad.refresh();
        } catch (e: unknown) {
          const msg = axios.isAxiosError(e)
            ? (e.response?.data as { message?: string } | undefined)?.message
            : undefined;
          alert('Verification failed', msg ?? (e instanceof Error ? e.message : 'Invalid verification code'), {
            variant: 'error',
          });
        } finally {
          setSavingPaymentSettings(false);
        }
        return;
      }

      if (!routeTncAccepted) {
        alert('Terms required', 'Please accept the payment account terms.', { variant: 'error' });
        return;
      }
      if (!chairmanPhone.trim() || !societyPan.trim() || !bankAccountNumber.trim() || !bankIfsc.trim() || !bankBeneficiaryName.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
        alert('Missing fields', 'Please fill all bank and KYC fields.', { variant: 'error' });
        return;
      }

      setSavingPaymentSettings(true);
      try {
        const result = await requestMemberPaymentSetupOtp(buildBankSetupPayload());
        setPaymentSetupStep('otp');
        setPaymentSetupEmail(result.email ?? '');
        setSetupOtp('');
        alert('Code sent', result.message ?? 'Verification code sent to your email.', { variant: 'success' });
      } catch (e: unknown) {
        const msg = axios.isAxiosError(e)
          ? (e.response?.data as { message?: string } | undefined)?.message
          : undefined;
        alert('Save failed', msg ?? (e instanceof Error ? e.message : 'Unable to send verification code'), {
          variant: 'error',
        });
      } finally {
        setSavingPaymentSettings(false);
      }
      return;
    }

    const keyId = razorpayKeyId.trim();
    const keySecret = razorpayKeySecret.trim();
    if (memberPaymentsEnabled && !keyId) {
      alert('Razorpay Key ID required', 'Enter your society Razorpay Key ID.', { variant: 'error' });
      return;
    }
    if (memberPaymentsEnabled && !keySecret && !paymentData?.configured) {
      alert('Razorpay Key Secret required', 'Enter your society Razorpay Key Secret.', { variant: 'error' });
      return;
    }

    setSavingPaymentSettings(true);
    try {
      const result = await updateMemberPaymentSettings({
        enabled: memberPaymentsEnabled,
        keyId,
        ...(keySecret ? { keySecret } : {}),
      });
      alert('Saved', result.message ?? 'Member payment settings saved.', { variant: 'success' });
      setRazorpayKeySecret('');
      paymentSettingsLoad.refresh();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert('Save failed', msg ?? (e instanceof Error ? e.message : 'Unable to save payment settings'), {
        variant: 'error',
      });
    } finally {
      setSavingPaymentSettings(false);
    }
  }

  async function resendPaymentSetupOtp() {
    setSavingPaymentSettings(true);
    try {
      const result = await requestMemberPaymentSetupOtp(buildBankSetupPayload());
      setPaymentSetupStep('otp');
      setPaymentSetupEmail(result.email ?? paymentSetupEmail);
      setSetupOtp('');
      alert('Code sent', 'Verification code sent again.', { variant: 'success' });
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert('Failed', msg ?? 'Unable to resend verification code', { variant: 'error' });
    } finally {
      setSavingPaymentSettings(false);
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
      <ChangePasswordFlow />

      <SectionCard
        title="Screenshots & screen recording"
        subtitle="Saved on this device only. Turn off to block screenshots and screen recording in the app."
      >
        <View style={styles.captureRow}>
          <View style={styles.captureText}>
            <Text style={[styles.captureLabel, { color: theme.text }]}>Allow screenshots</Text>
            <Text style={[styles.captureHint, { color: theme.textMuted }]}>
              {allowScreenCapture
                ? 'Screenshots and screen recording are allowed.'
                : 'Screenshots and screen recording are blocked.'}
            </Text>
          </View>
          <Switch
            value={allowScreenCapture}
            onValueChange={setAllowScreenCapture}
            trackColor={{ false: theme.divider, true: theme.accentGold }}
          />
        </View>
      </SectionCard>

      <SectionCard
        title="Maintenance Rules & Penalty Settings"
        subtitle="Configure default maintenance, grace days, penalty and per-member override mode"
      >
        {settingsLoad.loading ? <ListLoading /> : null}
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
              <Text style={styles.primaryBtnText}>{savingSettings ? 'Saving…' : 'Save Settings'}</Text>
            </Pressable>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Member online payments"
        subtitle={
          paymentSettingsLoad.data?.routeEnabled
            ? 'Add your society bank account - SOCIETY-ASSETS creates the Razorpay payment account automatically.'
            : 'Connect your society Razorpay account so members pay maintenance directly to your society'
        }
      >
        {paymentSettingsLoad.loading ? <ListLoading /> : null}
        {paymentSettingsLoad.error ? <ListError message={paymentSettingsLoad.error} /> : null}
        {paymentSettingsLoad.data ? (
          <View style={styles.form}>
            {paymentSettingsLoad.data.routeEnabled ? (
              <>
                {paymentSettingsLoad.data.routeStatus && paymentSettingsLoad.data.routeStatus !== 'NONE' ? (
                  <Text style={[styles.paymentHint, { color: theme.textMuted }]}>
                    Status: {paymentSettingsLoad.data.routeStatus}
                    {paymentSettingsLoad.data.routeError ? ` — ${paymentSettingsLoad.data.routeError}` : ''}
                  </Text>
                ) : null}
                {paymentSettingsLoad.data.routeStatus === 'ACTIVATED' ? (
                  <Text style={[styles.paymentHint, { color: theme.textMuted }]}>
                    Your society payment account is active. Members can pay maintenance online.
                  </Text>
                ) : paymentSettingsLoad.data.routeStatus === 'PENDING' ? (
                  <Text style={[styles.paymentHint, { color: theme.textMuted }]}>
                    Razorpay is verifying your bank account. This usually takes 1–2 business days.
                  </Text>
                ) : paymentSetupStep === 'otp' ? (
                  <>
                    <Text style={[styles.paymentHint, { color: theme.textMuted }]}>
                      A verification code was sent to {paymentSetupEmail || 'your email'}. Enter it below to confirm
                      bank setup.
                    </Text>
                    <FormField label="Verification code" theme={theme}>
                      <TextInput
                        style={inputStyle(theme)}
                        value={setupOtp}
                        onChangeText={setSetupOtp}
                        placeholder="6-digit code"
                        placeholderTextColor={theme.placeholder}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </FormField>
                    <Pressable
                      style={[
                        styles.primaryBtn,
                        { backgroundColor: theme.accent },
                        savingPaymentSettings ? styles.disabled : null,
                      ]}
                      onPress={savePaymentSettings}
                      disabled={savingPaymentSettings}
                    >
                      <Text style={styles.primaryBtnText}>
                        {savingPaymentSettings ? 'Verifying…' : 'Verify and set up bank account'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.linkBtn}
                      onPress={() => void resendPaymentSetupOtp()}
                    >
                      <Text style={[styles.linkBtnText, { color: theme.accent }]}>Resend code</Text>
                    </Pressable>
                    <Pressable
                      style={styles.linkBtn}
                      onPress={() => {
                        setPaymentSetupStep('form');
                        setSetupOtp('');
                        setPaymentSetupEmail('');
                      }}
                    >
                      <Text style={[styles.linkBtnText, { color: theme.textMuted }]}>Cancel</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <FormField label="Chairman phone" theme={theme}>
                      <TextInput
                        style={inputStyle(theme)}
                        value={chairmanPhone}
                        onChangeText={setChairmanPhone}
                        placeholder="10-digit mobile"
                        placeholderTextColor={theme.placeholder}
                        keyboardType="phone-pad"
                      />
                    </FormField>
                    <FormField label="Society PAN" theme={theme}>
                      <TextInput
                        style={inputStyle(theme)}
                        value={societyPan}
                        onChangeText={setSocietyPan}
                        placeholder="AAAAA9999A"
                        placeholderTextColor={theme.placeholder}
                        autoCapitalize="characters"
                      />
                    </FormField>
                    <FormField label="Bank account number" theme={theme}>
                      <TextInput
                        style={inputStyle(theme)}
                        value={bankAccountNumber}
                        onChangeText={setBankAccountNumber}
                        placeholder="Account number"
                        placeholderTextColor={theme.placeholder}
                        keyboardType="number-pad"
                      />
                    </FormField>
                    <FormField label="IFSC code" theme={theme}>
                      <TextInput
                        style={inputStyle(theme)}
                        value={bankIfsc}
                        onChangeText={setBankIfsc}
                        placeholder="HDFC0001234"
                        placeholderTextColor={theme.placeholder}
                        autoCapitalize="characters"
                      />
                    </FormField>
                    <FormField label="Account holder name" theme={theme}>
                      <TextInput
                        style={inputStyle(theme)}
                        value={bankBeneficiaryName}
                        onChangeText={setBankBeneficiaryName}
                        placeholder="As per bank records"
                        placeholderTextColor={theme.placeholder}
                      />
                    </FormField>
                    <FormField label="City" theme={theme}>
                      <TextInput
                        style={inputStyle(theme)}
                        value={city}
                        onChangeText={setCity}
                        placeholder="Pune"
                        placeholderTextColor={theme.placeholder}
                      />
                    </FormField>
                    <FormField label="State" theme={theme}>
                      <TextInput
                        style={inputStyle(theme)}
                        value={state}
                        onChangeText={setState}
                        placeholder="Maharashtra"
                        placeholderTextColor={theme.placeholder}
                      />
                    </FormField>
                    <FormField label="Postal code" theme={theme}>
                      <TextInput
                        style={inputStyle(theme)}
                        value={postalCode}
                        onChangeText={setPostalCode}
                        placeholder="411001"
                        placeholderTextColor={theme.placeholder}
                        keyboardType="number-pad"
                      />
                    </FormField>
                    <CheckboxField
                      label="I authorise SOCIETY-ASSETS to create a Razorpay payment account for our society"
                      checked={routeTncAccepted}
                      onChange={setRouteTncAccepted}
                    />
                    <Pressable
                      style={[
                        styles.primaryBtn,
                        { backgroundColor: theme.accent },
                        savingPaymentSettings ? styles.disabled : null,
                      ]}
                      onPress={savePaymentSettings}
                      disabled={savingPaymentSettings}
                    >
                      <Text style={styles.primaryBtnText}>
                        {savingPaymentSettings ? 'Sending code…' : 'Set up bank account'}
                      </Text>
                    </Pressable>
                  </>
                )}
              </>
            ) : (
              <>
                <CheckboxField
                  label="Allow members to pay maintenance online"
                  checked={memberPaymentsEnabled}
                  onChange={setMemberPaymentsEnabled}
                />
                <FormField label="Razorpay Key ID" theme={theme}>
                  <TextInput
                    style={inputStyle(theme)}
                    value={razorpayKeyId}
                    onChangeText={setRazorpayKeyId}
                    placeholder="rzp_live_... or rzp_test_..."
                    placeholderTextColor={theme.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </FormField>
                <FormField
                  label={
                    paymentSettingsLoad.data.keySecretMasked
                      ? `Razorpay Key Secret (${paymentSettingsLoad.data.keySecretMasked} saved — leave blank to keep)`
                      : 'Razorpay Key Secret'
                  }
                  theme={theme}
                >
                  <TextInput
                    style={inputStyle(theme)}
                    value={razorpayKeySecret}
                    onChangeText={setRazorpayKeySecret}
                    placeholder="Enter key secret"
                    placeholderTextColor={theme.placeholder}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </FormField>
                <Text style={[styles.paymentHint, { color: theme.textMuted }]}>
                  Get API keys from dashboard.razorpay.com → Settings → API Keys.
                </Text>
                <Pressable
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: theme.accent },
                    savingPaymentSettings ? styles.disabled : null,
                  ]}
                  onPress={savePaymentSettings}
                  disabled={savingPaymentSettings}
                >
                  <Text style={styles.primaryBtnText}>
                    {savingPaymentSettings ? 'Saving…' : 'Save payment settings'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Contract Types"
        subtitle="Used in the Contracts module dropdown. Leave code blank to auto-generate from the name."
      >
        {typesLoad.loading ? <ListLoading /> : null}
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
      </SectionCard>
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
  scroll: { padding: 12, paddingBottom: 32 },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  captureText: { flex: 1, minWidth: 0 },
  captureLabel: { fontSize: 16, fontWeight: '600' },
  captureHint: { fontSize: 13, marginTop: 4, lineHeight: 18 },
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
