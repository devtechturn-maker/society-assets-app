import { useState } from 'react';
import {
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
import { API_BASE_URL } from '../config/env';
import { useAppAlert } from '../context/AppAlertContext';
import { login } from '../services/api';
import { saveSession } from '../services/storage';
import { colors } from '../theme/colors';
import type { LoginData } from '../types/api';

type Props = {
  onLoggedIn: (user: LoginData) => void;
  onViewPlans: () => void;
};

const BRAND_POINTS = [
  'Encryption-grade credential handling',
  'Audit-ready activity trail and reports',
  'Chairman-controlled multi-society access',
] as const;

function loginErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { message?: string } | undefined;
    if (body?.message) return body.message;
    const noResponse = !error.response;
    const timedOut = error.code === 'ECONNABORTED';
    const network =
      noResponse &&
      (timedOut ||
        error.message === 'Network Error' ||
        (typeof error.message === 'string' && error.message.toLowerCase().includes('network')));
    if (network) {
      const base = String(API_BASE_URL);
      return (
        'Cannot reach the API at ' +
        base +
        '.\n\n' +
        'On a real phone, set EXPO_PUBLIC_API_URL in .env to your PC LAN IP (same Wi-Fi as the PC), ' +
        'ensure Spring is running, and Windows Firewall allows inbound TCP on that port.'
      );
    }
    if (error.response) {
      return error.response.statusText || `Server error (${error.response.status})`;
    }
  }
  return error instanceof Error ? error.message : 'Login failed';
}

export function LoginScreen({ onLoggedIn, onViewPlans }: Props) {
  const { alert } = useAppAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setInlineError('Enter email and password.');
      return;
    }
    setInlineError(null);
    setLoading(true);
    try {
      const data = await login(email, password);
      await saveSession(data);
      onLoggedIn(data);
    } catch (e: unknown) {
      if (__DEV__) {
        console.warn('[Login]', e);
      }
      const message = loginErrorMessage(e);
      setInlineError(message);
      alert('Login failed', message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <LinearGradient
            colors={[colors.navy700, colors.navy800, colors.navy900]}
            locations={[0, 0.58, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandPanel}
          >
            <Text style={styles.brandKicker}>SOCIETY ASSETS</Text>
            <Text style={styles.brandTitle}>Institutional-grade society finance governance.</Text>
            <Text style={styles.brandSubtitle}>
              Secure maintenance collection, expense transparency, and audit-ready reporting in one
              platform.
            </Text>
            <View style={styles.brandPoints}>
              {BRAND_POINTS.map((point) => (
                <View key={point} style={styles.brandPointRow}>
                  <View style={styles.bulletRing}>
                    <View style={styles.bulletDot} />
                  </View>
                  <Text style={styles.brandPointText}>{point}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          <View style={styles.formPanel}>
            <View style={styles.authCard}>
              <Text style={styles.cardTitle}>Member Portal</Text>
              <Text style={styles.cardSubtitle}>Authenticate to access your society operations.</Text>

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

              <Text style={[styles.label, styles.labelSpaced]}>Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
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
                  <Text style={styles.passwordToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>

              {inlineError ? <Text style={styles.error}>{inlineError}</Text> : null}

              <Pressable
                style={[styles.buttonPressable, loading ? styles.buttonDisabled : null]}
                onPress={handleSubmit}
                disabled={loading === true}
              >
                <LinearGradient
                  colors={[colors.navy900, colors.navy800]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.button}
                >
                  {loading ? (
                    <Text style={styles.buttonText}>Securing session...</Text>
                  ) : (
                    <Text style={styles.buttonText}>Secure Login</Text>
                  )}
                </LinearGradient>
              </Pressable>

              <View style={styles.newUserBox}>
                <Text style={styles.newUserLabel}>New society?</Text>
                <Text style={styles.newUserHint}>
                  New society? View plans to register. Already registered? After login, open Subscription in the
                  menu to upgrade or add members.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.plansBtn, pressed && styles.plansBtnPressed]}
                  onPress={onViewPlans}
                >
                  <Text style={styles.plansBtnText}>View plans (new society)</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
  },
  brandPanel: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 32,
  },
  brandKicker: {
    marginBottom: 16,
    fontSize: 13,
    letterSpacing: 2.2,
    fontWeight: '700',
    color: colors.gold600,
  },
  brandTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    marginTop: 20,
    marginBottom: 24,
    fontSize: 17,
    lineHeight: 26,
    color: colors.textOnDarkMuted,
  },
  brandPoints: {
    gap: 14,
  },
  brandPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletRing: {
    width: 17,
    height: 17,
    borderRadius: 999,
    backgroundColor: 'rgba(212, 160, 23, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.gold500,
  },
  brandPointText: {
    flex: 1,
    fontSize: 15,
    color: colors.textOnDarkSoft,
    lineHeight: 22,
  },
  formPanel: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  authCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 22,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.heading,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 15,
    color: colors.label,
    lineHeight: 22,
  },
  label: {
    fontSize: 12,
    color: colors.label,
    letterSpacing: 1.4,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  labelSpaced: {
    marginTop: 4,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.heading,
    backgroundColor: colors.white,
    marginBottom: 10,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    backgroundColor: colors.white,
    marginBottom: 10,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.heading,
  },
  passwordToggle: {
    paddingHorizontal: 12,
    height: 48,
    justifyContent: 'center',
  },
  passwordToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy800,
  },
  error: {
    color: colors.error,
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  buttonPressable: {
    marginTop: 14,
    borderRadius: 2,
    overflow: 'hidden',
  },
  button: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  newUserBox: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  newUserLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.label,
  },
  newUserHint: {
    marginTop: 6,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },
  plansBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.gold500,
    backgroundColor: 'rgba(212, 160, 23, 0.08)',
  },
  plansBtnPressed: {
    opacity: 0.9,
  },
  plansBtnText: {
    color: colors.navy800,
    fontSize: 15,
    fontWeight: '700',
  },
});
