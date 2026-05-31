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
import { useAppAlert } from '../context/AppAlertContext';
import { changeFirstLoginPassword } from '../services/api';
import { saveSession } from '../services/storage';
import { colors } from '../theme/colors';
import type { LoginData } from '../types/api';

type Props = {
  user: LoginData;
  onPasswordChanged: (user: LoginData) => void;
};

export function FirstLoginPasswordScreen({ user, onPasswordChanged }: Props) {
  const { alert } = useAppAlert();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (password.length < 8) {
      alert('Invalid password', 'Password must be at least 8 characters.', { variant: 'error' });
      return;
    }
    if (password !== confirm) {
      alert('Passwords do not match', 'Enter the same password in both fields.', { variant: 'error' });
      return;
    }
    setLoading(true);
    try {
      await changeFirstLoginPassword(password);
      const updated: LoginData = { ...user, firstLogin: false };
      await saveSession(updated);
      onPasswordChanged(updated);
    } catch (e: unknown) {
      const message =
        axios.isAxiosError(e) && (e.response?.data as { message?: string })?.message
          ? String((e.response?.data as { message?: string }).message)
          : e instanceof Error
            ? e.message
            : 'Could not update password';
      alert('Update failed', message, { variant: 'error' });
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
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={[colors.navy700, colors.navy900]}
            style={styles.header}
          >
            <Text style={styles.kicker}>SECURITY</Text>
            <Text style={styles.title}>Set your new password</Text>
            <Text style={styles.subtitle}>
              Your society sent a temporary password by email. Choose a new password to continue.
            </Text>
          </LinearGradient>

          <View style={styles.form}>
            <Text style={styles.label}>New password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat password"
              placeholderTextColor="#94a3b8"
            />
            <Pressable
              style={[styles.buttonWrap, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient colors={[colors.navy900, colors.navy800]} style={styles.button}>
                <Text style={styles.buttonText}>{loading ? 'Saving…' : 'Continue'}</Text>
              </LinearGradient>
            </Pressable>
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
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  buttonWrap: { marginTop: 20, borderRadius: 2, overflow: 'hidden' },
  buttonDisabled: { opacity: 0.7 },
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
});
