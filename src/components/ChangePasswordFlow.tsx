import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAppAlert } from '../context/AppAlertContext';
import { SectionCard } from './dashboard/SectionCard';
import {
  confirmChangePassword,
  requestChangePasswordOtp,
  verifyChangePasswordOtp,
} from '../services/api';
import { performAppLogout } from '../services/authLogout';
import { useTheme } from '../theme/ThemeContext';

type Step = 'start' | 'otp' | 'password';

function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { message?: string } | undefined;
    if (body?.message) return body.message;
  }
  return error instanceof Error ? error.message : fallback;
}

export function ChangePasswordFlow({
  onComplete,
  embedded = false,
}: {
  onComplete?: () => void;
  embedded?: boolean;
}) {
  const { toast } = useAppAlert();
  const { theme } = useTheme();
  const [step, setStep] = useState<Step>('start');
  const [accountEmail, setAccountEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleRequestOtp() {
    setInlineError(null);
    setInfoMessage(null);
    setResetToken('');
    setLoading(true);
    try {
      const response = await requestChangePasswordOtp();
      setAccountEmail(response.email);
      setOtp('');
      setStep('otp');
      setInfoMessage(response.message);
    } catch (e: unknown) {
      const message = apiErrorMessage(e, 'Could not send verification code.');
      setInlineError(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (loading) return;
    setInlineError(null);
    setResetToken('');
    setOtp('');
    setLoading(true);
    try {
      const response = await requestChangePasswordOtp();
      setAccountEmail(response.email);
      setInfoMessage(response.message);
      toast('A new verification code has been sent to your email.', 'success');
    } catch (e: unknown) {
      const message = apiErrorMessage(e, 'Could not resend verification code.');
      setInlineError(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim() || otp.trim().length !== 6) {
      setInlineError('Enter the 6-digit verification code from your email.');
      return;
    }
    setInlineError(null);
    setLoading(true);
    try {
      const response = await verifyChangePasswordOtp(otp.trim());
      setResetToken(response.resetToken);
      setPassword('');
      setConfirmPassword('');
      setStep('password');
      setInfoMessage('Verification code confirmed. Choose your new password.');
      toast('Verification code confirmed', 'success');
    } catch (e: unknown) {
      const message = apiErrorMessage(e, 'Invalid verification code.');
      setInlineError(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmPassword() {
    if (password.length < 8) {
      setInlineError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setInlineError('Passwords do not match.');
      return;
    }
    setInlineError(null);
    setLoading(true);
    try {
      await confirmChangePassword(resetToken, password);
      toast('Password updated. Please sign in with your new password.', 'success');
      onComplete?.();
      await performAppLogout();
    } catch (e: unknown) {
      const message = apiErrorMessage(e, 'Could not update password.');
      setInlineError(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function resetFlow() {
    setStep('start');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setResetToken('');
    setInlineError(null);
    setInfoMessage(null);
  }

  const body = (
    <>
      <Text style={[styles.lead, { color: theme.textMuted }]}>
        {step === 'start'
          ? 'We will send a one-time code to your registered email address.'
          : step === 'otp'
            ? 'Enter the verification code from your email.'
            : step === 'password'
              ? 'Choose a new password for your account.'
              : ''}
      </Text>

      {step === 'start' ? (
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRequestOtp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send verification code</Text>
          )}
        </Pressable>
      ) : null}

      {step === 'otp' ? (
        <>
          {infoMessage ? <Text style={[styles.info, { color: theme.accentGold }]}>{infoMessage}</Text> : null}
          {accountEmail ? (
            <Text style={[styles.emailHint, { color: theme.textMuted }]}>Code sent to {accountEmail}</Text>
          ) : null}
          <Text style={[styles.label, { color: theme.textMuted }]}>Verification code</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.divider, color: theme.text }]}
            placeholder="6-digit code"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={(v) => {
              setOtp(v.replace(/\D/g, ''));
              if (inlineError) setInlineError(null);
            }}
          />
          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerifyOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify code</Text>
            )}
          </Pressable>
          <View style={styles.linkRow}>
            <Pressable onPress={handleResendOtp} disabled={loading}>
              <Text style={[styles.inlineLink, { color: theme.accentGold }]}>Resend code</Text>
            </Pressable>
            <Pressable onPress={resetFlow} disabled={loading}>
              <Text style={[styles.inlineLink, { color: theme.accentGold }]}>Start over</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {step === 'password' ? (
        <>
          {infoMessage ? <Text style={[styles.info, { color: theme.accentGold }]}>{infoMessage}</Text> : null}
          <Text style={[styles.label, { color: theme.textMuted }]}>New password</Text>
          <View style={[styles.passwordWrap, { borderColor: theme.divider }]}>
            <TextInput
              style={[styles.passwordInput, { color: theme.text }]}
              placeholder="At least 8 characters"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (inlineError) setInlineError(null);
              }}
            />
            <Pressable style={styles.passwordToggle} onPress={() => setShowPassword((v) => !v)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.text} />
            </Pressable>
          </View>
          <Text style={[styles.label, { color: theme.textMuted }]}>Confirm password</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.divider, color: theme.text }]}
            placeholder="Repeat new password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              if (inlineError) setInlineError(null);
            }}
          />
          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleConfirmPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Update password</Text>
            )}
          </Pressable>
          <Pressable onPress={() => setStep('otp')} disabled={loading}>
            <Text style={[styles.inlineLink, { color: theme.accentGold }]}>Back to verification code</Text>
          </Pressable>
        </>
      ) : null}

      {inlineError ? <Text style={styles.error}>{inlineError}</Text> : null}
    </>
  );

  if (embedded) {
    return body;
  }

  return (
    <SectionCard title="Change password" subtitle="Update your login password with email verification">
      {body}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  passwordToggle: {
    paddingHorizontal: 12,
    height: 46,
    justifyContent: 'center',
  },
  button: {
    marginTop: 8,
    height: 46,
    borderRadius: 6,
    backgroundColor: '#70088c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.85 },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  info: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  emailHint: { fontSize: 12, marginBottom: 8 },
  error: { color: '#dc2626', fontSize: 12, marginTop: 10, lineHeight: 16 },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  inlineLink: { fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },
});
