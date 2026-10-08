import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppLogo } from '../components/AppLogo';
import { PlanPicker } from '../components/subscription/PlanPicker';
import type { SocietySubscriptionStatus } from '../types/api';
import { colors } from '../theme/colors';

type Props = {
  status: SocietySubscriptionStatus;
  societyId: string | null;
  /** Chairman or treasurer; residents are asked to contact them. */
  canPurchase: boolean;
  onActivated: (status: SocietySubscriptionStatus) => void;
  onLogout: () => void;
  onRefreshStatus: () => Promise<SocietySubscriptionStatus>;
};

/** Shown when the society's trial or plan (including its grace period) has ended. */
export function PlanPurchaseScreen({ status, canPurchase, onActivated, onLogout, onRefreshStatus }: Props) {
  const [current, setCurrent] = useState(status);

  async function refresh() {
    const next = await onRefreshStatus();
    setCurrent(next);
    if (next.canAccessApp) {
      onActivated(next);
    }
  }

  const flatCount = current.flatCount ?? 0;
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppLogo variant="splash" size={72} style={styles.logo} />
        <Text style={styles.title}>Choose your plan</Text>
        <Text style={styles.message}>
          {current.message ?? 'Your trial or plan has ended. Choose a plan to continue.'}
        </Text>
        <Text style={styles.flats}>
          Priced for {flatCount} flat{flatCount === 1 ? '' : 's'} in your society · prices include everything for the whole period
        </Text>

        <PlanPicker
          plans={current.durationPlans ?? []}
          flatCount={flatCount}
          canPurchase={canPurchase}
          onActivated={() => void refresh()}
        />

        <Pressable style={styles.logout} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  logo: { alignSelf: 'center', marginBottom: 4 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.navy900,
    textAlign: 'center',
    marginTop: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  flats: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
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
