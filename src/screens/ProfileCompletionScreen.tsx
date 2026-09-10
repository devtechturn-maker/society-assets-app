import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useAppAlert } from '../context/AppAlertContext';
import {
  completeMemberEmail,
  requestMemberEmailVerificationOtp,
  verifyMemberEmailOtp,
} from '../services/api';
import { saveSession } from '../services/storage';
import { colors } from '../theme/colors';
import type { LoginData } from '../types/api';
import { isPlaceholderMemberEmail, isValidEmailFormat } from '../utils/profileCompletion';

const RESEND_COOLDOWN_SECONDS = 45;
const OTP_LENGTH = 6;

type Props = {
  user: LoginData;
  onCompleted: (user: LoginData) => void;
};

type Step = 'email' | 'otp';

function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { message?: string } | undefined;
    if (body?.message) return body.message;
  }
  return error instanceof Error ? error.message : fallback;
}

export function ProfileCompletionScreen({ user, onCompleted }: Props) {
  const { alert, toast } = useAppAlert();
  const otpRefs = useRef<Array<TextInput | null>>([]);

  const initialEmail = useMemo(() => {
    const candidate = (user.email ?? user.memberProfile?.email ?? '').trim();
    return isPlaceholderMemberEmail(candidate) ? '' : candidate;
  }, [user.email, user.memberProfile?.email]);

  const [step, setStep] = useState<Step>(() => (initialEmail ? 'otp' : 'email'));
  const [email, setEmail] = useState(initialEmail);
  const [otpDigits, setOtpDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(''));
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sessionUser, setSessionUser] = useState(user);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setResendCooldown((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const emailValid = isValidEmailFormat(email) && !isPlaceholderMemberEmail(email);
  const otpValue = otpDigits.join('');
  const otpComplete = otpValue.length === OTP_LENGTH;

  async function persistSessionPatch(patch: Partial<LoginData>) {
    const next: LoginData = { ...sessionUser, ...patch };
    await saveSession(next);
    setSessionUser(next);
    return next;
  }

  async function handleSendOtp(fromResend = false) {
    if (sending || (fromResend && resendCooldown > 0)) {
      return;
    }
    if (!emailValid) {
      alert('Invalid email', 'Enter a valid email address to continue.', { variant: 'error' });
      return;
    }
    setSending(true);
    try {
      const needsCapture =
        sessionUser.emailNeedsCapture === true ||
        isPlaceholderMemberEmail(sessionUser.email) ||
        (sessionUser.email ?? '').trim().toLowerCase() !== email.trim().toLowerCase();

      const response = needsCapture
        ? await completeMemberEmail(email.trim())
        : await requestMemberEmailVerificationOtp();

      const next = await persistSessionPatch({
        ...(response.token ? { token: response.token } : {}),
        email: response.email,
        emailNeedsCapture: false,
        emailVerified: false,
        profileCompletionRequired: true,
      });
      setEmail(response.email);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setStep('otp');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast(`Verification code sent to ${next.email}`, 'success');
      requestAnimationFrame(() => otpRefs.current[0]?.focus());
    } catch (e: unknown) {
      alert('Could not send code', apiErrorMessage(e, 'Check the email and try again.'), {
        variant: 'error',
      });
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    if (verifying || !otpComplete) {
      return;
    }
    setVerifying(true);
    try {
      const response = await verifyMemberEmailOtp(otpValue);
      const next = await persistSessionPatch({
        ...(response.token ? { token: response.token } : {}),
        email: response.email ?? email,
        emailVerified: true,
        profileCompletionRequired: false,
        emailNeedsCapture: false,
      });
      toast('Email verified', 'success');
      onCompleted(next);
    } catch (e: unknown) {
      alert('Verification failed', apiErrorMessage(e, 'Invalid or expired code.'), {
        variant: 'error',
      });
    } finally {
      setVerifying(false);
    }
  }

  function updateOtpDigit(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, '');
    if (cleaned.length > 1) {
      // Paste support
      const chars = cleaned.slice(0, OTP_LENGTH).split('');
      const next = Array(OTP_LENGTH).fill('');
      chars.forEach((ch, i) => {
        next[i] = ch;
      });
      setOtpDigits(next);
      const focusAt = Math.min(chars.length, OTP_LENGTH - 1);
      otpRefs.current[focusAt]?.focus();
      return;
    }
    const digit = cleaned.slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyPress(index: number, key: string) {
    if (key !== 'Backspace') {
      return;
    }
    if (otpDigits[index]) {
      setOtpDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      return;
    }
    if (index > 0) {
      otpRefs.current[index - 1]?.focus();
      setOtpDigits((prev) => {
        const next = [...prev];
        next[index - 1] = '';
        return next;
      });
    }
  }

  const resendLabel =
    resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend OTP';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={[colors.navy700, colors.navy900]} style={styles.header}>
            <Text style={styles.kicker}>ACCOUNT SETUP</Text>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              We need to verify your email to activate your account. This step is required before you
              can use the app.
            </Text>
          </LinearGradient>

          <View style={styles.form}>
            {step === 'email' ? (
              <>
                <Text style={styles.label}>Email address</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor="#94a3b8"
                  returnKeyType="done"
                  onSubmitEditing={() => void handleSendOtp(false)}
                />
                <Text style={styles.hint}>Use an inbox you can access. Temporary login emails are not allowed.</Text>

                <Pressable
                  style={[styles.buttonWrap, (!emailValid || sending) && styles.buttonDisabled]}
                  onPress={() => void handleSendOtp(false)}
                  disabled={!emailValid || sending}
                >
                  <LinearGradient colors={[colors.navy900, colors.navy800]} style={styles.button}>
                    {sending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Send OTP</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.label}>Email</Text>
                <View style={styles.readOnly}>
                  <Text style={styles.readOnlyText}>{email}</Text>
                </View>
                <Pressable onPress={() => setStep('email')} style={styles.changeLink}>
                  <Text style={styles.changeLinkText}>Change email</Text>
                </Pressable>

                <Text style={[styles.label, styles.otpLabel]}>Enter 6-digit code</Text>
                <View style={styles.otpRow}>
                  {otpDigits.map((digit, index) => (
                    <TextInput
                      key={`otp-${index}`}
                      ref={(ref) => {
                        otpRefs.current[index] = ref;
                      }}
                      style={styles.otpBox}
                      value={digit}
                      onChangeText={(v) => updateOtpDigit(index, v)}
                      onKeyPress={({ nativeEvent }) => handleOtpKeyPress(index, nativeEvent.key)}
                      keyboardType="number-pad"
                      maxLength={index === 0 ? OTP_LENGTH : 1}
                      textContentType="oneTimeCode"
                      autoComplete="sms-otp"
                      selectTextOnFocus
                    />
                  ))}
                </View>

                <Pressable
                  style={[styles.buttonWrap, (!otpComplete || verifying) && styles.buttonDisabled]}
                  onPress={() => void handleVerify()}
                  disabled={!otpComplete || verifying}
                >
                  <LinearGradient colors={[colors.navy900, colors.navy800]} style={styles.button}>
                    {verifying ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Verify Email</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <Pressable
                  style={[styles.secondaryBtn, (sending || resendCooldown > 0) && styles.buttonDisabled]}
                  onPress={() => void handleSendOtp(true)}
                  disabled={sending || resendCooldown > 0}
                >
                  {sending ? (
                    <ActivityIndicator color={colors.navy800} />
                  ) : (
                    <Text style={styles.secondaryBtnText}>{resendLabel}</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.pageBg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 28,
  },
  kicker: {
    color: colors.gold600,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 12,
    color: colors.textOnDarkMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    padding: 20,
    backgroundColor: colors.white,
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.label,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
    marginTop: 8,
  },
  otpLabel: { marginTop: 20 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 8,
  },
  readOnly: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: colors.pageBg,
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.heading,
  },
  changeLink: { alignSelf: 'flex-start', paddingVertical: 8 },
  changeLinkText: {
    color: colors.navy800,
    fontSize: 13,
    fontWeight: '700',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: colors.heading,
  },
  buttonWrap: { marginTop: 20, borderRadius: 2, overflow: 'hidden' },
  buttonDisabled: { opacity: 0.55 },
  button: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  secondaryBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: colors.navy800,
    fontSize: 13,
    fontWeight: '700',
  },
});
