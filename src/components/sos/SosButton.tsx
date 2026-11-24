import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cancelMySos, fetchMySos, raiseSos } from '../../services/api';
import type { SosAlert } from '../../types/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { apiErrorMessage } from '../../utils/apiError';

const RED = '#dc2626';

/**
 * v22 SOS for residents. Asks once to confirm (so a pocket tap does not alarm the gate), then alerts every guard
 * and the society office. Shows the live status of the latest alert.
 */
export function SosButton() {
  const { confirm, toast } = useAppAlert();
  const [latest, setLatest] = useState<SosAlert | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const list = await fetchMySos().catch(() => [] as SosAlert[]);
    setLatest(list.find((a) => a.status !== 'CLOSED') ?? null);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);

  function ask() {
    confirm({
      title: 'Send SOS?',
      message: 'All security guards and the society office will get an emergency alert with your flat number.',
      confirmText: 'Send SOS',
      destructive: true,
      onConfirm: async () => {
        setSending(true);
        try {
          setLatest(await raiseSos());
          toast('SOS sent. Help has been alerted.', 'success');
        } catch (e) {
          toast(apiErrorMessage(e, 'Could not send SOS. Call the gate.'), 'error');
        } finally {
          setSending(false);
        }
      },
    });
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        disabled={sending}
        onPress={ask}
        accessibilityRole="button"
        accessibilityLabel="Send SOS emergency alert"
        style={({ pressed }) => [styles.button, { opacity: sending ? 0.6 : pressed ? 0.85 : 1 }]}
      >
        <Text style={styles.title}>{sending ? 'Sending…' : 'SOS'}</Text>
        <Text style={styles.sub}>Emergency – alert security and office</Text>
      </Pressable>
      {latest ? (
        <View style={styles.status}>
          <Text style={styles.statusText}>
            {latest.status === 'OPEN' ? 'SOS sent – waiting for a guard' : `${latest.respondedByName ?? 'Security'} is coming`}
          </Text>
          <Pressable
            onPress={async () => {
              try {
                await cancelMySos(latest.id);
                setLatest(null);
                toast('SOS closed', 'success');
              } catch (e) {
                toast(apiErrorMessage(e, 'Could not close'), 'error');
              }
            }}
          >
            <Text style={styles.cancel}>I'm safe – close</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  button: { backgroundColor: RED, borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  sub: { color: '#fee2e2', fontSize: 12, fontWeight: '700', marginTop: 2 },
  status: { borderWidth: 1, borderColor: RED, borderRadius: 12, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef2f2' },
  statusText: { color: RED, fontWeight: '800', flex: 1 },
  cancel: { color: '#7f1d1d', fontWeight: '700', textDecorationLine: 'underline' },
});
