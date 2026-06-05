import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WEB_PORTAL_URL } from '../config/env';
import type { SocietySubscriptionStatus } from '../types/api';

type Props = {
  status: SocietySubscriptionStatus;
  onLogout: () => void;
};

export function ExpiredSubscriptionScreen({ status, onLogout }: Props) {
  function openPortal() {
    const url = status.portalUrl?.startsWith('http') ? status.portalUrl : WEB_PORTAL_URL;
    Linking.openURL(url).catch(() => undefined);
  }

  return (
    <View style={styles.page}>
      <Text style={styles.icon}>!</Text>
      <Text style={styles.title}>Plan expired</Text>
      <Text style={styles.message}>
        {status.message ??
          'Your Society Assets subscription has expired. Renew on our website to continue using the app.'}
      </Text>
      {status.planName ? (
        <View style={styles.box}>
          <Text style={styles.boxLabel}>Previous plan</Text>
          <Text style={styles.boxValue}>{status.planName}</Text>
          {status.validUntil ? (
            <Text style={styles.boxMeta}>Expired {new Date(status.validUntil).toLocaleDateString()}</Text>
          ) : null}
        </View>
      ) : null}
      <Pressable style={styles.primary} onPress={openPortal}>
        <Text style={styles.primaryText}>Renew on website</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={onLogout}>
        <Text style={styles.secondaryText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 24,
    justifyContent: 'center',
  },
  icon: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    lineHeight: 56,
    textAlign: 'center',
    borderRadius: 28,
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    fontSize: 28,
    fontWeight: '800',
    overflow: 'hidden',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginTop: 16,
  },
  message: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  box: {
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  boxLabel: { fontSize: 12, color: '#64748b', textTransform: 'uppercase' },
  boxValue: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginTop: 4 },
  boxMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  primary: {
    marginTop: 24,
    backgroundColor: '#70088c',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: '#475569', fontWeight: '600' },
});
