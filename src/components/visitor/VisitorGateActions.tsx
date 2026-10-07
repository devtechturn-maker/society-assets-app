import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { checkInVisitor, checkOutVisitor } from '../../services/api';
import { useAppAlert } from '../../context/AppAlertContext';

type Props = {
  visitorId: string;
  visitorName: string;
  status: string;
  onResolved?: () => void;
};

/** Gate desk action: mark an approved visitor as entered, or an entered visitor as exited. */
export function VisitorGateActions({ visitorId, visitorName, status, onResolved }: Props) {
  const { toast } = useAppAlert();
  const [loading, setLoading] = useState(false);
  const entering = status === 'APPROVED';

  async function handlePress() {
    if (loading) return;
    setLoading(true);
    try {
      if (entering) {
        await checkInVisitor(visitorId);
        toast(`${visitorName} marked as entered`, 'success');
      } else {
        await checkOutVisitor(visitorId);
        toast(`${visitorName} marked as exited`, 'success');
      }
      onResolved?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        entering ? styles.enterBtn : styles.exitBtn,
        (loading || pressed) && styles.btnPressed,
      ]}
      onPress={() => void handlePress()}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>{entering ? 'Mark entered' : 'Mark exited'}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.88,
  },
  enterBtn: {
    backgroundColor: '#10b981',
  },
  exitBtn: {
    backgroundColor: '#334155',
  },
  text: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});
