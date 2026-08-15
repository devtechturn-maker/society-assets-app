import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { approveVisitor, rejectVisitor } from '../../services/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { VisitorRejectReasonModal } from './VisitorRejectReasonModal';

type Props = {
  visitorId: string;
  visitorName: string;
  disabled?: boolean;
  onResolved?: () => void;
};

export function VisitorApprovalActions({
  visitorId,
  visitorName,
  disabled = false,
  onResolved,
}: Props) {
  const { toast } = useAppAlert();
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  async function handleApprove() {
    if (loading || disabled) return;
    setLoading('approve');
    try {
      await approveVisitor(visitorId);
      toast(`${visitorName} approved`, 'success');
      onResolved?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Approval failed', 'error');
    } finally {
      setLoading(null);
    }
  }

  async function handleReject(reason: string) {
    if (loading || disabled) return;
    setLoading('reject');
    try {
      await rejectVisitor(visitorId, reason);
      setRejectOpen(false);
      toast('Visitor rejected', 'success');
      onResolved?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Rejection failed', 'error');
    } finally {
      setLoading(null);
    }
  }

  const busy = loading != null || disabled;

  return (
    <>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            styles.approveBtn,
            (busy || pressed) && styles.btnPressed,
          ]}
          onPress={() => void handleApprove()}
          disabled={busy}
        >
          {loading === 'approve' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.approveText}>Approve</Text>
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            styles.rejectBtn,
            (busy || pressed) && styles.btnPressed,
          ]}
          onPress={() => setRejectOpen(true)}
          disabled={busy}
        >
          <Text style={styles.rejectText}>Reject</Text>
        </Pressable>
      </View>

      <VisitorRejectReasonModal
        visible={rejectOpen}
        visitorName={visitorName}
        loading={loading === 'reject'}
        onCancel={() => {
          if (loading !== 'reject') {
            setRejectOpen(false);
          }
        }}
        onSubmit={(reason) => void handleReject(reason)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.88,
  },
  approveBtn: {
    backgroundColor: '#10b981',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
  },
  approveText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  rejectText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});
