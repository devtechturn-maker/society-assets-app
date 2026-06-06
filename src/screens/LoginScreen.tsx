import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { API_BASE_URL } from '../config/env';
import { useAppAlert } from '../context/AppAlertContext';
import { LoginCityscape } from '../components/LoginCityscape';
import { login } from '../services/api';
import { initializeAppViewContext } from '../services/appContext';
import { saveSession } from '../services/storage';
import { colors } from '../theme/colors';
import type { LoginData } from '../types/api';

const LOGO = require('../../assets/primary-logo.png');
const LOGO_ASPECT = 1536 / 1024;

type Props = {
  onLoggedIn: (user: LoginData) => void;
  onViewPlans: () => void;
};

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

function useLoginLogoSize(screenWidth: number, screenHeight: number) {
  return useMemo(() => {
    const maxLogoHeight = Math.min(screenHeight * 0.38, 255);
    const maxLogoWidth = screenWidth - 48;
    let logoWidth = Math.min(maxLogoWidth, 220);
    let logoHeight = logoWidth * LOGO_ASPECT;
    if (logoHeight > maxLogoHeight) {
      logoHeight = maxLogoHeight;
      logoWidth = logoHeight / LOGO_ASPECT;
    }
    return { logoWidth, logoHeight };
  }, [screenWidth, screenHeight]);
}

export function LoginScreen({ onLoggedIn, onViewPlans }: Props) {
  const { alert } = useAppAlert();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { logoWidth, logoHeight } = useLoginLogoSize(screenWidth, screenHeight);
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
      await initializeAppViewContext(data);
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
              <Image
                source={LOGO}
                style={{ width: logoWidth, height: logoHeight, marginBottom: 18 }}
                resizeMode="contain"
                accessibilityLabel="Society Assets"
              />

              <View style={styles.authCard}>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Login</Text>
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
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.navy800}
                    />
                  </Pressable>
                </View>

                {inlineError ? (
                  <Text style={styles.error} numberOfLines={3}>
                    {inlineError}
                  </Text>
                ) : null}

                <Pressable
                  style={[styles.buttonPressable, loading ? styles.buttonDisabled : null]}
                  onPress={handleSubmit}
                  disabled={loading === true}
                >
                  {loading ? (
                    <View style={styles.button}>
                      <ActivityIndicator color={colors.white} />
                    </View>
                  ) : (
                    <View style={styles.button}>
                      <Text style={styles.buttonText}>Secure Login</Text>
                    </View>
                  )}
                </Pressable>

                <Text style={styles.footerNote} numberOfLines={2}>
                  Society registration is available after subscription checkout.
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
});
