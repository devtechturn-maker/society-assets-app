import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppLogo } from '../components/AppLogo';
import type { SocietySubscriptionStatus } from '../types/api';
import { colors } from '../theme/colors';

type Props = {
  status: SocietySubscriptionStatus;
  societyId: string | null;
  /** Chairman or treasurer: the people who manage the society's plan. */
  isOffice: boolean;
  onActivated: (status: SocietySubscriptionStatus) => void;
  onLogout: () => void;
  onRefreshStatus: () => Promise<SocietySubscriptionStatus>;
};

function day(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Shown when the society's trial or plan (including its grace period) has ended. Plans are not sold in the app
 * (store payment rules); access comes back on its own once the plan is renewed.
 */
export function SubscriptionEndedScreen({ status, isOffice, onActivated, onLogout, onRefreshStatus }: Props) {
  const [current, setCurrent] = useState(status);
  const [checking, setChecking] = useState(false);
  const [stillEnded, setStillEnded] = useState(false);

  async function refresh() {
    setChecking(true);
    setStillEnded(false);
    try {
      const next = await onRefreshStatus();
      setCurrent(next);
      if (next.canAccessApp) {
        onActivated(next);
      } else {
        setStillEnded(true);
      }
    } finally {
      setChecking(false);
    }
  }

  const endedOn = day(current.validUntil);
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppLogo variant="splash" size={72} style={styles.logo} />
        <Text style={styles.title}>Subscription ended</Text>
        <Text style={styles.message}>
          {`Your society's ${current.lifecycleStatus === 'EXPIRED' && current.planName ? 'plan' : 'trial or plan'} ended${
            endedOn ? ` on ${endedOn}` : ''
          }. The app opens again as soon as it is renewed.`}
        </Text>
        <Text style={styles.note}>
          {isOffice
            ? 'Your society data is safe and nothing has been deleted.'
            : 'Please contact your society office (chairman or treasurer). Your data is safe.'}
        </Text>

        <Pressable style={[styles.button, checking && styles.buttonDisabled]} onPress={() => void refresh()} disabled={checking}>
          {checking ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Check again</Text>}
        </Pressable>
        {stillEnded ? <Text style={styles.still}>Still not renewed. Try again in a little while.</Text> : null}

        <Pressable style={styles.logout} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, paddingTop: 64, paddingBottom: 40 },
  logo: { alignSelf: 'center', marginBottom: 8 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.navy900,
    textAlign: 'center',
    marginTop: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.navy900,
    textAlign: 'center',
    marginTop: 12,
  },
  note: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.navy900,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  still: { marginTop: 10, textAlign: 'center', color: colors.muted, fontSize: 13 },
  logout: {
    marginTop: 20,
    alignSelf: 'center',
    padding: 10,
  },
  logoutText: {
    color: colors.muted,
    fontWeight: '700',
  },
});
