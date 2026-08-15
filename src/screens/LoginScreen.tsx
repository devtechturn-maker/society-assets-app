import { useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppAlert } from '../context/AppAlertContext';
import { LoginCityscape } from '../components/LoginCityscape';
import { AppLogo } from '../components/AppLogo';
import { PhoneVerifiedChip, SelectableOptionCard } from '../components/wizard';
import { PRIMARY_LOGO_ASPECT } from '../constants/branding';
import { completeSmsLoginOtp, requestSmsLoginOtp, verifySmsLoginOtp } from '../services/api';
import { withBlockingLoader } from '../services/globalApiLoading';
import { initializeAppViewContext, clearAppViewContext, requiresRoleSelection } from '../services/appContext';
import { saveSession } from '../services/storage';
import { colors } from '../theme/colors';
import type { LoginAccountOption, LoginData } from '../types/api';
import { apiErrorMessage } from '../utils/apiError';
import { CreateSocietyWizard } from './CreateSocietyWizard';
import { JoinSocietyWizard } from './JoinSocietyWizard';

type Props = {
  onLoggedIn: (user: LoginData) => void;
  onViewPlans: () => void;
};

type Step = 'phone' | 'otp' | 'select' | 'onboard' | 'create' | 'join';

const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function normalizePhoneInput(value: string): string {
  let digits = digitsOnly(value);
  if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  if (digits.length > 10 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

function accountOptionKey(account: LoginAccountOption): string {
  return account.societyId || account.memberId || `user:${account.userId}`;
}

function societyInitials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'S';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function accountSubtitle(account: LoginAccountOption): string {
  const role = formatRoleLabel(account.role);
  const bits = [role];
  if (account.flatNumber) {
    bits.push(`Flat ${account.flatNumber}`);
  }
  if (account.displayName) {
    bits.push(account.displayName);
  }
  return bits.join(' · ');
}

function formatRoleLabel(role: string): string {
  const normalized = (role ?? '').toUpperCase();
  if (normalized === 'MEMBER') return 'Member';
  if (normalized === 'CHAIRMAN') return 'Chairman';
  if (normalized === 'TREASURER') return 'Treasurer';
  if (normalized === 'GATEKEEPER') return 'Gate Keeper';
  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
}

function useLoginLogoSize(screenWidth: number, screenHeight: number) {
  return useMemo(() => {
    const maxLogoHeight = Math.min(screenHeight * 0.38, 255);
    const maxLogoWidth = screenWidth - 48;
    let logoWidth = Math.min(maxLogoWidth, 220);
    let logoHeight = logoWidth * PRIMARY_LOGO_ASPECT;
    if (logoHeight > maxLogoHeight) {
      logoHeight = maxLogoHeight;
      logoWidth = logoHeight / PRIMARY_LOGO_ASPECT;
    }
    return { logoWidth, logoHeight };
  }, [screenWidth, screenHeight]);
}

export function LoginScreen({ onLoggedIn, onViewPlans }: Props) {
  const { alert } = useAppAlert();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { logoWidth, logoHeight } = useLoginLogoSize(screenWidth, screenHeight);
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [accounts, setAccounts] = useState<LoginAccountOption[]>([]);
  const [selectionToken, setSelectionToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [sandboxOtp, setSandboxOtp] = useState('111111');

  function dismissKeyboard() {
    Keyboard.dismiss();
  }

  async function finishLogin(data: LoginData) {
    dismissKeyboard();
    if (requiresRoleSelection(data)) {
      await clearAppViewContext();
    } else {
      await initializeAppViewContext(data);
    }
    await saveSession(data);
    onLoggedIn(data);
  }

  async function handleRequestOtp() {
    dismissKeyboard();
    const normalized = normalizePhoneInput(phone);
    if (!INDIAN_MOBILE_PATTERN.test(normalized)) {
      setInlineError('Enter a valid 10-digit mobile number.');
      return;
    }
    setInlineError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const response = await requestSmsLoginOtp(normalized);
      setPhone(normalized);
      setStep('otp');
      setOtp('');
      setAccounts([]);
      setSelectionToken('');
      setSandboxMode(response.sandbox === true);
      setSandboxOtp(response.sandboxOtp ?? '111111');
      setSuccessMessage(response.message);
    } catch (e: unknown) {
      if (__DEV__) {
        console.warn('[Login]', e);
      }
      const message = apiErrorMessage(e, 'Login failed');
      setInlineError(message);
      alert('Could not send code', message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (!INDIAN_MOBILE_PATTERN.test(phone) || loading) {
      return;
    }
    setInlineError(null);
    setLoading(true);
    try {
      const response = await requestSmsLoginOtp(phone);
      setOtp('');
      setAccounts([]);
      setSelectionToken('');
      setSandboxMode(response.sandbox === true);
      setSandboxOtp(response.sandboxOtp ?? '111111');
      setSuccessMessage(response.message);
      alert(
        'Code ready',
        response.sandbox
          ? `Sandbox mode: use OTP ${response.sandboxOtp ?? '111111'}.`
          : 'A new login code has been sent to your mobile.',
        { variant: 'success' }
      );
    } catch (e: unknown) {
      const message = apiErrorMessage(e, 'Login failed');
      setInlineError(message);
      alert('Could not resend code', message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    dismissKeyboard();
    if (!otp.trim() || !/^\d{6}$/.test(otp.trim())) {
      setInlineError('Enter the 6-digit code from your SMS.');
      return;
    }
    setInlineError(null);
    setLoading(true);
    try {
      const result = await verifySmsLoginOtp(phone, otp);
      if (result.onboardingRequired) {
        setSelectionToken(result.selectionToken);
        setAccounts([]);
        setStep('onboard');
        setSuccessMessage(null);
        return;
      }
      if (result.selectionRequired) {
        setAccounts(result.accounts);
        setSelectionToken(result.selectionToken);
        setStep('select');
        setSuccessMessage(null);
        return;
      }
      await withBlockingLoader('Loading...', () => finishLogin(result));
    } catch (e: unknown) {
      if (__DEV__) {
        console.warn('[Login]', e);
      }
      const message = apiErrorMessage(e, 'Login failed');
      setInlineError(message);
      alert('Login failed', message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectAccount(account: LoginAccountOption) {
    if (!selectionToken || loading) {
      return;
    }
    dismissKeyboard();
    setInlineError(null);
    setLoading(true);
    try {
      const data = await completeSmsLoginOtp(phone, selectionToken, account);
      await withBlockingLoader('Loading...', () => finishLogin(data));
    } catch (e: unknown) {
      if (__DEV__) {
        console.warn('[Login]', e);
      }
      const message = apiErrorMessage(e, 'Login failed');
      setInlineError(message);
      alert('Login failed', message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function backToPhone() {
    dismissKeyboard();
    setLoading(false);
    setStep('phone');
    setPhone('');
    setOtp('');
    setAccounts([]);
    setSelectionToken('');
    setInlineError(null);
    setSuccessMessage(null);
    setSandboxMode(false);
  }

  function backToOtp() {
    dismissKeyboard();
    setLoading(false);
    setStep('otp');
    setAccounts([]);
    setSelectionToken('');
    setInlineError(null);
    setSuccessMessage(null);
  }

  const subtitle =
    step === 'phone'
      ? 'Enter your mobile number. We will send a one-time code by SMS.'
      : step === 'otp'
        ? 'Enter the 6-digit code sent to your mobile.'
        : step === 'onboard'
          ? 'This number is new. Create a society or join an existing one.'
          : 'Your number is linked to more than one society. Choose where you want to continue.';

  const cardTitle =
    step === 'select' ? 'Choose society' : step === 'onboard' ? 'Get started' : 'Login';

  if (step === 'create') {
    return (
      <CreateSocietyWizard
        phone={phone}
        selectionToken={selectionToken}
        onCreated={(data) => void withBlockingLoader('Loading...', () => finishLogin(data))}
        onBack={() => {
          setStep('onboard');
          setInlineError(null);
        }}
      />
    );
  }

  if (step === 'join') {
    return (
      <JoinSocietyWizard
        phone={phone}
        selectionToken={selectionToken}
        onJoined={(data) => void withBlockingLoader('Loading...', () => finishLogin(data))}
        onBack={() => {
          setStep('onboard');
          setInlineError(null);
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[colors.navy700, colors.navy800, colors.navy900]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LoginCityscape />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.page}>
            <View style={styles.contentBlock} pointerEvents="box-none">
            <View style={[styles.logoSlot, { minHeight: logoHeight, marginBottom: 18 }]}>
              <AppLogo variant="primary" size={logoWidth} />
            </View>

              <View style={styles.authCard}>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{cardTitle}</Text>
                  <Text style={styles.cardSubtitle}>{subtitle}</Text>

                  {step === 'phone' ? (
                    <>
                      <Text style={styles.label}>Mobile Number</Text>
                      <View style={styles.phoneRow}>
                        <View style={styles.countryCode}>
                          <Text style={styles.countryCodeText}>+91</Text>
                        </View>
                        <TextInput
                          style={styles.phoneInput}
                          placeholder="9876543210"
                          placeholderTextColor="#94a3b8"
                          keyboardType="phone-pad"
                          maxLength={10}
                          value={phone}
                          onChangeText={(v) => {
                            setPhone(normalizePhoneInput(v));
                            if (inlineError) setInlineError(null);
                          }}
                        />
                      </View>

                      {inlineError ? (
                        <Text style={styles.error} numberOfLines={3}>
                          {inlineError}
                        </Text>
                      ) : null}

                      <Pressable
                        style={[styles.buttonPressable, loading ? styles.buttonDisabled : null]}
                        onPress={handleRequestOtp}
                        disabled={loading === true}
                      >
                        <View style={styles.button}>
                          <Text style={styles.buttonText}>Send SMS code</Text>
                        </View>
                      </Pressable>
                    </>
                  ) : null}

                  {step === 'otp' ? (
                    <>
                      {successMessage ? (
                        <Text style={styles.success} numberOfLines={3}>
                          {successMessage}
                        </Text>
                      ) : null}

                      {sandboxMode ? (
                        <View style={styles.sandboxBanner}>
                          <Text style={styles.sandboxBannerTitle}>Sandbox mode</Text>
                          <Text style={styles.sandboxBannerText}>
                            No SMS is sent. Use test OTP <Text style={styles.sandboxOtp}>{sandboxOtp}</Text>.
                          </Text>
                          <Pressable
                            style={({ pressed }) => [styles.sandboxFillBtn, pressed && styles.plansLinkPressed]}
                            onPress={() => {
                              setOtp(sandboxOtp);
                              if (inlineError) setInlineError(null);
                            }}
                          >
                            <Text style={styles.sandboxFillBtnText}>Fill {sandboxOtp}</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Text style={styles.emailHint}>
                          Code sent to <Text style={styles.emailHintStrong}>+91 {phone}</Text>
                        </Text>
                      )}

                      <Text style={[styles.label, styles.labelSpaced]}>Login code</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="6-digit code"
                        placeholderTextColor="#94a3b8"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={otp}
                        onChangeText={(v) => {
                          setOtp(digitsOnly(v).slice(0, 6));
                          if (inlineError) setInlineError(null);
                        }}
                        blurOnSubmit
                        onSubmitEditing={() => void handleVerifyOtp()}
                      />

                      {inlineError ? (
                        <Text style={styles.error} numberOfLines={3}>
                          {inlineError}
                        </Text>
                      ) : null}

                      <Pressable
                        style={[styles.buttonPressable, loading ? styles.buttonDisabled : null]}
                        onPress={handleVerifyOtp}
                        disabled={loading === true}
                      >
                        <View style={styles.button}>
                          <Text style={styles.buttonText}>Verify code</Text>
                        </View>
                      </Pressable>

                      <View style={styles.otpActions}>
                        <Pressable
                          style={({ pressed }) => [styles.textLink, pressed && styles.plansLinkPressed]}
                          onPress={() => void handleResendOtp()}
                          hitSlop={8}
                        >
                          <Text style={styles.textLinkText}>Resend code</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [styles.textLink, pressed && styles.plansLinkPressed]}
                          onPress={backToPhone}
                          hitSlop={8}
                        >
                          <Text style={styles.textLinkText}>Use a different number</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : null}

                  {step === 'onboard' ? (
                    <>
                      <PhoneVerifiedChip phone={phone} style={styles.loginPhoneChip} />

                      <Text style={styles.selectHint}>
                        Choose how you want to continue with Society Assets.
                      </Text>

                      <SelectableOptionCard
                        title="Create society"
                        meta="Set up buildings, flats, and numbering as chairman"
                        showChevron
                        leading={
                          <View style={[styles.accountAvatar, styles.choiceAvatarCreate]}>
                            <Text style={styles.accountAvatarText}>+</Text>
                          </View>
                        }
                        onPress={() => setStep('create')}
                      />

                      <SelectableOptionCard
                        title="Join society"
                        meta="Find your society and claim an open flat"
                        showChevron
                        leading={
                          <View style={[styles.accountAvatar, styles.choiceAvatarJoin]}>
                            <Text style={styles.accountAvatarText}>↗</Text>
                          </View>
                        }
                        onPress={() => setStep('join')}
                      />

                      <View style={styles.otpActions}>
                        <Pressable
                          style={({ pressed }) => [styles.textLink, pressed && styles.plansLinkPressed]}
                          onPress={backToOtp}
                        >
                          <Text style={styles.textLinkText}>Back to verification code</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : null}

                  {step === 'select' ? (
                    <>
                      <PhoneVerifiedChip phone={phone} style={styles.loginPhoneChip} />

                      <Text style={styles.selectHint}>
                        Tap a society to open your member access there.
                      </Text>

                      <ScrollView style={styles.accountList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {accounts.map((account) => (
                          <SelectableOptionCard
                            key={accountOptionKey(account)}
                            title={account.societyName || 'Society'}
                            meta={accountSubtitle(account)}
                            showChevron
                            disabled={loading}
                            leading={
                              <View style={styles.accountAvatar}>
                                <Text style={styles.accountAvatarText}>
                                  {societyInitials(account.societyName)}
                                </Text>
                              </View>
                            }
                            onPress={() => handleSelectAccount(account)}
                          />
                        ))}
                      </ScrollView>

                      {inlineError ? (
                        <Text style={styles.error} numberOfLines={3}>
                          {inlineError}
                        </Text>
                      ) : null}

                      {loading ? (
                        <Text style={styles.loadingText}>Opening society…</Text>
                      ) : null}

                      <View style={styles.otpActions}>
                        <Pressable
                          style={({ pressed }) => [styles.textLink, pressed && styles.plansLinkPressed]}
                          onPress={backToOtp}
                          disabled={loading}
                        >
                          <Text style={styles.textLinkText}>Back to verification code</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : null}

                  <Text style={styles.footerNote} numberOfLines={2}>
                    Use the mobile number registered with your society member profile.
                  </Text>

                  <Pressable
                    style={({ pressed }) => [styles.plansLink, pressed && styles.plansLinkPressed]}
                    onPress={onViewPlans}
                  >
                    <Text style={styles.plansLinkText}>View plans & register →</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.navy900,
  },
  safe: {
    flex: 1,
  },
  flex: { flex: 1 },
  page: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  contentBlock: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'center',
  },
  logoSlot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#020617',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardBody: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.navy900,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  label: {
    fontSize: 10,
    color: colors.navy800,
    letterSpacing: 1.1,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  labelSpaced: {
    marginTop: 10,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCode: {
    height: 46,
    minWidth: 58,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy800,
  },
  phoneInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.heading,
    backgroundColor: '#f8fafc',
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.heading,
    backgroundColor: '#f8fafc',
  },
  error: {
    color: colors.error,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  success: {
    color: '#15803d',
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  emailHint: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
    lineHeight: 16,
  },
  emailHintStrong: {
    fontWeight: '700',
    color: colors.heading,
  },
  sandboxBanner: {
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
  },
  sandboxBannerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9a3412',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sandboxBannerText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#7c2d12',
  },
  sandboxOtp: {
    fontWeight: '800',
    fontSize: 14,
    color: '#9a3412',
  },
  sandboxFillBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 4,
  },
  sandboxFillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c2410c',
  },
  loginPhoneChip: {
    marginTop: 0,
    marginBottom: 10,
  },
  selectHint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    marginBottom: 4,
  },
  choiceAvatarCreate: {
    backgroundColor: '#70088c',
  },
  choiceAvatarJoin: {
    backgroundColor: colors.navy800,
  },
  accountList: {
    maxHeight: 280,
    marginTop: 8,
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#70088c',
  },
  accountAvatarText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  loadingRow: {
    marginTop: 10,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  buttonPressable: {
    marginTop: 16,
    borderRadius: 6,
    overflow: 'hidden',
  },
  button: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#70088c',
  },
  buttonDisabled: {
    opacity: 0.85,
  },
  buttonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  footerNote: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  plansLink: {
    marginTop: 6,
    alignSelf: 'center',
    paddingVertical: 2,
  },
  plansLinkPressed: {
    opacity: 0.75,
  },
  plansLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#70088c',
  },
  otpActions: {
    marginTop: 10,
    gap: 4,
    alignItems: 'center',
  },
  textLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  textLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#70088c',
  },
});
