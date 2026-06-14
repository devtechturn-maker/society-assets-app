import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useAppAlert } from '../context/AppAlertContext';
import { requestMemberEmailVerificationOtp, verifyMemberEmailOtp } from '../services/api';
import { updateStoredUser } from '../services/storage';
import type { LoginData } from '../types/api';
import { useTheme } from '../theme/ThemeContext';

const RESEND_COOLDOWN_SECONDS = 60;

type Props = {
  email: string;
  emailVerified: boolean;
  emailVerificationRequired: boolean;
  onVerified?: (patch: Partial<LoginData>) => void;
  expanded?: boolean;
  embedded?: boolean;
  alwaysShow?: boolean;
};

function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { message?: string } | undefined;
    if (body?.message) return body.message;
  }
  return error instanceof Error ? error.message : fallback;
}

export function EmailVerificationFlow({
  email,
  emailVerified,
  emailVerificationRequired,
  onVerified,
  expanded = true,
  embedded = false,
  alwaysShow = false,
}: Props) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const otpInputRef = useRef<TextInput>(null);
  const sendInFlightRef = useRef(false);
  const verifyInFlightRef = useRef(false);
  const [showFlow, setShowFlow] = useState(expanded && !emailVerified);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (emailVerified) {
      setShowFlow(false);
      setOtp('');
      setOtpSent(false);
      setResendCooldown(0);
      Keyboard.dismiss();
      otpInputRef.current?.blur();
    }
  }, [emailVerified]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setResendCooldown((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!alwaysShow && !emailVerificationRequired) {
    return null;
  }

  if (emailVerified) {
    if (embedded) {
      return null;
    }
    return (
      <View
        style={[
          styles.verifiedRow,
          { backgroundColor: theme.accentSoft, borderColor: theme.accentGold },
        ]}
      >
        <Ionicons name="checkmark-circle" size={22} color={theme.accentGold} />
        <View style={styles.verifiedCopy}>
          <Text style={[styles.verifiedTitle, { color: theme.text }]}>Email verified</Text>
          <Text style={[styles.verifiedEmail, { color: theme.textMuted }]}>{email}</Text>
        </View>
      </View>
    );
  }

  async function handleSendOtp() {
    if (sendInFlightRef.current || otpSending || resendCooldown > 0) {
      return;
    }
    sendInFlightRef.current = true;
    setOtpSending(true);
    Keyboard.dismiss();
    otpInputRef.current?.blur();
    try {
      const response = await requestMemberEmailVerificationOtp();
      setOtpSent(true);
      setOtp('');
      setShowFlow(true);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast(`Verification code sent to ${response.email}`, 'success');
    } catch (e: unknown) {
      toast(apiErrorMessage(e, 'Could not send verification code.'), 'error');
    } finally {
      setOtpSending(false);
      sendInFlightRef.current = false;
    }
  }

  async function handleVerify() {
    if (verifyInFlightRef.current || otpVerifying) {
      return;
    }
    if (!otp.trim() || otp.trim().length !== 6) {
      toast('Enter the 6-digit code from your email.', 'error');
      return;
    }
    verifyInFlightRef.current = true;
    setOtpVerifying(true);
    Keyboard.dismiss();
    otpInputRef.current?.blur();
    try {
      await verifyMemberEmailOtp(otp.trim());
      const patch: Partial<LoginData> = { emailVerified: true };
      await updateStoredUser(patch);
      onVerified?.(patch);
      toast('Email verified successfully', 'success');
      setOtp('');
      setOtpSent(false);
      setShowFlow(false);
      setResendCooldown(0);
    } catch (e: unknown) {
      toast(apiErrorMessage(e, 'Invalid verification code.'), 'error');
    } finally {
      setOtpVerifying(false);
      verifyInFlightRef.current = false;
    }
  }

  const sendDisabled = otpSending || resendCooldown > 0;
  const resendLabel =
    resendCooldown > 0
      ? `Resend code in ${resendCooldown}s`
      : otpSent
        ? 'Resend code'
        : 'Send verification code';

  const flowContent = (
    <>
      {!embedded ? (
        <>
          <View style={styles.headerRow}>
            <View style={[styles.iconCircle, { backgroundColor: theme.pageBg }]}>
              <Ionicons name="mail-unread-outline" size={22} color={theme.accentGold} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: theme.text }]}>Verify email address</Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                Required before password change and other email features
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: '#fef3c7' }]}>
              <Text style={styles.statusPillText}>Pending</Text>
            </View>
          </View>
          <Text style={[styles.emailLine, { color: theme.text }]}>{email}</Text>
        </>
      ) : (
        <Text style={[styles.embeddedLead, { color: theme.textMuted }]}>
          A 6-digit code will be sent to <Text style={{ fontWeight: '700', color: theme.text }}>{email}</Text>.
          Enter it here after checking your inbox.
        </Text>
      )}

      {!showFlow ? (
        <Pressable
          style={[styles.primaryBtn, sendDisabled && styles.btnDisabled]}
          onPress={() => void handleSendOtp()}
          disabled={sendDisabled}
        >
          {otpSending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Send verification code</Text>
            </>
          )}
        </Pressable>
      ) : (
        <>
          <Text style={[styles.stepsLead, { color: theme.textMuted }]}>
            1. We emailed a 6-digit code to your inbox{'\n'}
            2. Open your email app (Gmail, Outlook, etc.){'\n'}
            3. Enter the code below — no website needed
          </Text>

          <Pressable
            style={[styles.secondaryBtn, { borderColor: theme.accentGold }, sendDisabled && styles.btnDisabled]}
            onPress={() => void handleSendOtp()}
            disabled={sendDisabled}
          >
            {otpSending ? (
              <ActivityIndicator color={theme.accentGold} />
            ) : (
              <Text style={[styles.secondaryBtnText, { color: theme.accentGold }]}>{resendLabel}</Text>
            )}
          </Pressable>

          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Verification code</Text>
          <TextInput
            ref={otpInputRef}
            style={[styles.otpInput, { borderColor: theme.divider, color: theme.text, backgroundColor: theme.pageBg }]}
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="Enter 6-digit code"
            placeholderTextColor="#94a3b8"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => void handleVerify()}
          />

          <Pressable
            style={[styles.primaryBtn, otpVerifying && styles.btnDisabled]}
            onPress={() => void handleVerify()}
            disabled={otpVerifying}
          >
            {otpVerifying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Confirm verification</Text>
              </>
            )}
          </Pressable>

          {!embedded ? (
            <Pressable onPress={() => setShowFlow(false)} style={styles.cancelLink}>
              <Text style={[styles.cancelText, { color: theme.textMuted }]}>Hide</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </>
  );

  if (embedded) {
    return flowContent;
  }

  return (
    <View style={[styles.wrap, { borderColor: theme.accentGold, backgroundColor: theme.accentSoft }]}>
      {flowContent}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '800' },
  subtitle: { fontSize: 12, lineHeight: 17 },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400e',
    textTransform: 'uppercase',
  },
  emailLine: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepsLead: {
    fontSize: 13,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  otpInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#70088c',
  },
  secondaryBtn: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  btnDisabled: { opacity: 0.55 },
  cancelLink: { alignSelf: 'center', paddingVertical: 4 },
  cancelText: { fontSize: 12, fontWeight: '600' },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  embeddedLead: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  verifiedCopy: { flex: 1 },
  verifiedTitle: { fontSize: 14, fontWeight: '700' },
  verifiedEmail: { fontSize: 12, marginTop: 2 },
});
