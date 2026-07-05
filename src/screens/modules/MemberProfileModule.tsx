import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';
import { ChangePasswordFlow } from '../../components/ChangePasswordFlow';
import { EmailVerificationFlow } from '../../components/EmailVerificationFlow';
import { ListError, ListLoading } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { useAppAlert } from '../../context/AppAlertContext';
import {
  fetchMemberProfile,
  isEmailNotVerifiedError,
  updateMemberProfile,
} from '../../services/api';
import { getUser, updateStoredUser } from '../../services/storage';
import type { LoginData, MemberProfile } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';

type Props = {
  onUserUpdated?: (patch: Partial<LoginData>) => void;
  onLogout?: () => void;
};

function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { message?: string } | undefined;
    if (body?.message) return body.message;
  }
  return error instanceof Error ? error.message : fallback;
}

export function MemberProfileModule({ onUserUpdated }: Props) {
  const { theme, mode, setMode } = useTheme();
  const { toast } = useAppAlert();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchMemberProfile();
      setProfile(data);
      setFirstName(data.firstName);
      setLastName(data.lastName);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not load profile.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleSaveProfile() {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await updateMemberProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setProfile(updated);
      setFirstName(updated.firstName);
      setLastName(updated.lastName);
      const stored = await getUser();
      const patch: Partial<LoginData> = {
        firstName: updated.firstName,
        lastName: updated.lastName,
      };
      if (stored?.memberProfile) {
        patch.memberProfile = { ...stored.memberProfile, name: updated.fullName };
      }
      await updateStoredUser(patch);
      onUserUpdated?.(patch);
      toast('Profile updated', 'success');
    } catch (e: unknown) {
      toast(apiErrorMessage(e, 'Could not update profile.'), 'error');
      if (isEmailNotVerifiedError(e)) {
        /* interceptor navigates to profile */
      }
    } finally {
      setSaving(false);
    }
  }

  function handleVerified(patch: Partial<LoginData>) {
    setProfile((current) => (current ? { ...current, emailVerified: true } : current));
    onUserUpdated?.(patch);
    void loadProfile(true);
  }

  const canChangePassword = profile && (profile.emailVerified || !profile.emailVerificationRequired);
  const needsEmailVerification = profile && !profile.emailVerified;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadProfile(true)} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {loading ? <ListLoading /> : null}
      {error ? <ListError message={error} /> : null}

      {profile ? (
        <>
          <SectionCard title="Personal details" subtitle="Update your name">
            <Text style={[styles.label, { color: theme.textMuted }]}>First name</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.divider, color: theme.text }]}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              placeholder="First name"
              placeholderTextColor="#94a3b8"
            />

            <Text style={[styles.label, { color: theme.textMuted }]}>Last name</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.divider, color: theme.text }]}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              placeholder="Last name"
              placeholderTextColor="#94a3b8"
            />

            <Text style={[styles.label, { color: theme.textMuted }]}>Email address</Text>
            <View style={[styles.emailRow, { borderColor: theme.divider, backgroundColor: theme.cardBg }]}>
              <Ionicons name="mail-outline" size={18} color={theme.textMuted} />
              <Text style={[styles.emailText, { color: theme.text }]}>{profile.email}</Text>
              {profile.emailVerified ? (
                <View style={[styles.inlineBadge, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[styles.inlineBadgeText, { color: theme.accentGold }]}>Verified</Text>
                </View>
              ) : !profile.emailVerified ? (
                <View style={[styles.inlineBadge, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.inlineBadgeText, { color: '#92400e' }]}>Not verified</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.hint, { color: theme.textMuted }]}>
              Email cannot be changed in the app. Contact your society office if it is incorrect.
            </Text>

            <Text style={[styles.label, { color: theme.textMuted }]}>Flat</Text>
            <View style={[styles.readOnlyField, { borderColor: theme.divider, backgroundColor: theme.cardBg }]}>
              <Text style={[styles.readOnlyText, { color: theme.text }]}>{profile.flatNumber}</Text>
            </View>

            <Pressable
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={() => void handleSaveProfile()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save profile</Text>
              )}
            </Pressable>
          </SectionCard>

          {profile.emailVerificationRequired ? (
            <SectionCard
              title="Verify email"
              subtitle="Confirm your email with a one-time code sent to your inbox"
            >
              <EmailVerificationFlow
                email={profile.email}
                emailVerified={profile.emailVerified}
                emailVerificationRequired={profile.emailVerificationRequired}
                onVerified={handleVerified}
                expanded={false}
                embedded
                alwaysShow
              />
            </SectionCard>
          ) : null}

          <SectionCard
            title="Change password"
            subtitle={
              canChangePassword
                ? 'Update your login password with email verification'
                : needsEmailVerification
                  ? 'Verify your email first'
                  : 'Update your login password with email verification'
            }
          >
            {canChangePassword ? (
              <ChangePasswordFlow embedded />
            ) : (
              <Text style={[styles.hint, { color: theme.textMuted }]}>
                Confirm your email in the section above, then you can change your password here.
              </Text>
            )}
          </SectionCard>

          <SectionCard title="Appearance" subtitle="Choose light or dark mode on this device">
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={[styles.toggleLabel, { color: theme.text }]}>Dark mode</Text>
                <Text style={[styles.hint, { color: theme.textMuted, marginTop: 2 }]}>
                  {mode === 'dark' ? 'Dark theme is on' : 'Light theme is on'}
                </Text>
              </View>
              <Switch
                value={mode === 'dark'}
                onValueChange={(on) => setMode(on ? 'dark' : 'light')}
                trackColor={{ false: theme.divider, true: theme.accentGold }}
              />
            </View>
          </SectionCard>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 32, gap: 14 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emailText: { flex: 1, fontSize: 14, fontWeight: '600' },
  inlineBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inlineBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  readOnlyField: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  readOnlyText: { fontSize: 14 },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  button: {
    marginTop: 14,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleCopy: { flex: 1 },
  toggleLabel: { fontSize: 16, fontWeight: '600' },

});
