import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAppAlert } from '../context/AppAlertContext';
import { LoginCityscape } from '../components/LoginCityscape';
import { AppLogo } from '../components/AppLogo';
import { PRIMARY_LOGO_ASPECT } from '../constants/branding';
import {
  requestPasswordResetOtp,
  resetPasswordWithToken,
  verifyPasswordResetOtp,
} from '../services/api';
import { colors } from '../theme/colors';

type Props = {
  onBackToLogin: () => void;
  onPasswordReset: () => void;
};

type Step = 'email' | 'otp' | 'password' | 'done';

function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { message?: string } | undefined;
    if (body?.message) return body.message;
  }
  return error instanceof Error ? error.message : fallback;
}

function useLoginLogoSize(screenWidth: number, screenHeight: number) {
  const maxLogoHeight = Math.min(screenHeight * 0.32, 220);
  const maxLogoWidth = screenWidth - 48;
  let logoWidth = Math.min(maxLogoWidth, 200);
  let logoHeight = logoWidth * PRIMARY_LOGO_ASPECT;
  if (logoHeight > maxLogoHeight) {
    logoHeight = maxLogoHeight;
    logoWidth = logoHeight / PRIMARY_LOGO_ASPECT;
  }
  return { logoWidth, logoHeight };
}

function stepSubtitle(step: Step): string {
  switch (step) {
    case 'email':
      return 'Enter your email and we will send a verification code.';
    case 'otp':
      return 'Enter the 6-digit code sent to your email.';
    case 'password':
      return 'Verification complete. Choose your new password.';
    default:
      return 'Your password has been updated successfully.';
  }
}

export function ForgotPasswordScreen({ onBackToLogin, onPasswordReset }: Props) {
  const { alert, toast } = useAppAlert();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { logoWidth, logoHeight } = useLoginLogoSize(screenWidth, screenHeight);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleRequestOtp() {
    if (!email.trim()) {
      setInlineError('Enter your email address.');
      return;
    }
    setInlineError(null);
    setInfoMessage(null);
    setResetToken('');
    setLoading(true);
    try {
      const response = await requestPasswordResetOtp(email);
      setSavedEmail(email.trim().toLowerCase());
      setOtp('');
      setStep('otp');
      setInfoMessage(response.message);
    } catch (e: unknown) {
      const message = apiErrorMessage(e, 'Could not send verification code.');
      setInlineError(message);
      alert('Request failed', message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (!savedEmail || loading) return;
    setInlineError(null);
    setResetToken('');
    setOtp('');
    setLoading(true);
    try {
      const response = await requestPasswordResetOtp(savedEmail);
      setInfoMessage(response.message);
      alert('Code sent', 'A new verification code has been sent to your email.', { variant: 'success' });
    } catch (e: unknown) {
      const message = apiErrorMessage(e, 'Could not resend verification code.');
      setInlineError(message);
      alert('Request failed', message, { variant: 'error' });
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
      const response = await verifyPasswordResetOtp(savedEmail, otp.trim());
      setResetToken(response.resetToken);
      setPassword('');
      setConfirmPassword('');
      setStep('password');
      setInfoMessage('Verification code confirmed. Choose your new password.');
      alert('Code verified', 'You can now set a new password.', { variant: 'success' });
    } catch (e: unknown) {
      const message = apiErrorMessage(e, 'Invalid verification code.');
      setInlineError(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
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
      await resetPasswordWithToken(savedEmail, resetToken, password);
      setStep('done');
      alert('Password updated', 'You can now sign in with your new password.', { variant: 'success' });
    } catch (e: unknown) {
      const message = apiErrorMessage(e, 'Could not reset password.');
      setInlineError(message);
      alert('Reset failed', message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function backToEmailStep() {
    setStep('email');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setResetToken('');
    setInlineError(null);
    setInfoMessage(null);
  }

  function backToOtpStep() {
    setStep('otp');
    setPassword('');
    setConfirmPassword('');
    setResetToken('');
    setInlineError(null);
    setInfoMessage(null);
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
            <View style={styles.contentBlock}>
              <AppLogo variant="primary" size={logoWidth} style={{ marginBottom: 14 }} />

              <View style={styles.authCard}>
                <View style={styles.cardBody}>
                  <Pressable onPress={onBackToLogin} style={styles.backLink}>
                    <Text style={styles.backLinkText}>← Back to login</Text>
                  </Pressable>

                  <Text style={styles.cardTitle}>Forgot password</Text>
                  <Text style={styles.cardSubtitle}>{stepSubtitle(step)}</Text>

                  {step === 'email' ? (
                    <>
                      <Text style={styles.label}>Email Address</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="chairman@societyassets.com"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoCorrect={false}
                        value={email}
                        onChangeText={(v) => {
                          setEmail(v);
                          if (inlineError) setInlineError(null);
                        }}
                      />
                    </>
                  ) : null}

                  {step === 'otp' ? (
                    <>
                      {infoMessage ? (
                        <Text style={styles.info} numberOfLines={3}>
                          {infoMessage}
                        </Text>
                      ) : null}
                      <Text style={styles.emailHint}>Code sent to {savedEmail}</Text>

                      <Text style={styles.label}>Verification code</Text>
                      <TextInput
                        style={styles.input}
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
                    </>
                  ) : null}

                  {step === 'password' ? (
                    <>
                      {infoMessage ? (
                        <Text style={styles.info} numberOfLines={3}>
                          {infoMessage}
                        </Text>
                      ) : null}

                      <Text style={[styles.label, styles.labelSpaced]}>New password</Text>
                      <View style={styles.passwordWrap}>
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="At least 8 characters"
                          placeholderTextColor="#94a3b8"
                          secureTextEntry={!showPassword}
                          value={password}
                          onChangeText={(v) => {
                            setPassword(v);
                            if (inlineError) setInlineError(null);
                          }}
                        />
                        <Pressable
                          style={styles.passwordToggle}
                          onPress={() => setShowPassword((v) => !v)}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                        >
                          <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={colors.navy800}
                          />
                        </Pressable>
                      </View>

                      <Text style={[styles.label, styles.labelSpaced]}>Confirm password</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Repeat new password"
                        placeholderTextColor="#94a3b8"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={(v) => {
                          setConfirmPassword(v);
                          if (inlineError) setInlineError(null);
                        }}
                      />
                    </>
                  ) : null}

                  {inlineError ? (
                    <Text style={styles.error} numberOfLines={4}>
                      {inlineError}
                    </Text>
                  ) : null}

                  {step === 'email' ? (
                    <Pressable
                      style={[styles.buttonPressable, loading ? styles.buttonDisabled : null]}
                      onPress={handleRequestOtp}
                      disabled={loading}
                    >
                      <View style={styles.button}>
                        {loading ? (
                          <ActivityIndicator color={colors.white} />
                        ) : (
                          <Text style={styles.buttonText}>Send verification code</Text>
                        )}
                      </View>
                    </Pressable>
                  ) : null}

                  {step === 'otp' ? (
                    <>
                      <Pressable
                        style={[styles.buttonPressable, loading ? styles.buttonDisabled : null]}
                        onPress={handleVerifyOtp}
                        disabled={loading}
                      >
                        <View style={styles.button}>
                          {loading ? (
                            <ActivityIndicator color={colors.white} />
                          ) : (
                            <Text style={styles.buttonText}>Verify code</Text>
                          )}
                        </View>
                      </Pressable>
                      <View style={styles.linkRow}>
                        <Pressable onPress={handleResendOtp} disabled={loading}>
                          <Text style={styles.inlineLink}>Resend code</Text>
                        </Pressable>
                        <Pressable onPress={backToEmailStep} disabled={loading}>
                          <Text style={styles.inlineLink}>Use different email</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : null}

                  {step === 'password' ? (
                    <>
                      <Pressable
                        style={[styles.buttonPressable, loading ? styles.buttonDisabled : null]}
                        onPress={handleResetPassword}
                        disabled={loading}
                      >
                        <View style={styles.button}>
                          {loading ? (
                            <ActivityIndicator color={colors.white} />
                          ) : (
                            <Text style={styles.buttonText}>Reset password</Text>
                          )}
                        </View>
                      </Pressable>
                      <View style={styles.linkRow}>
                        <Pressable onPress={backToOtpStep} disabled={loading}>
                          <Text style={styles.inlineLink}>Back to verification code</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : null}

                  {step === 'done' ? (
                    <Pressable style={styles.buttonPressable} onPress={onPasswordReset}>
                      <View style={styles.button}>
                        <Text style={styles.buttonText}>Back to login</Text>
                      </View>
                    </Pressable>
                  ) : null}
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
  safe: { flex: 1 },
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
      android: { elevation: 6 },
    }),
  },
  cardBody: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
  },
  backLink: {
    marginBottom: 10,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
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
  labelSpaced: { marginTop: 10 },
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
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  passwordInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.heading,
  },
  passwordToggle: {
    paddingHorizontal: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 16,
    color: colors.success,
  },
  emailHint: {
    marginBottom: 10,
    fontSize: 12,
    color: colors.muted,
  },
  error: {
    color: colors.error,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
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
  buttonDisabled: { opacity: 0.85 },
  buttonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  linkRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  inlineLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#70088c',
    textDecorationLine: 'underline',
  },
});
