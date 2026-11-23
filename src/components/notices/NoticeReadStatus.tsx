import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchNoticeReads, remindNoticeUnread } from '../../services/api';
import type { NoticeReadStatus as Status } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { apiErrorMessage } from '../../utils/apiError';
import { unitName } from '../../utils/unitName';

/** Office: how many residents read a notice, who has not, and a reminder to them. */
export function NoticeReadStatus({ noticeId, canRemind }: { noticeId: string; canRemind: boolean }) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [data, setData] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchNoticeReads(noticeId)
      .then((d) => (setData(d), setError(null)))
      .catch((e) => setError(apiErrorMessage(e, 'Could not load read status')));
  }, [noticeId]);

  useEffect(load, [load]);

  async function remind() {
    setBusy(true);
    try {
      const out = await remindNoticeUnread(noticeId);
      toast(`Reminder sent to ${out.reminded}`, 'success');
      load();
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not send the reminder'), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Text style={{ color: theme.textMuted }}>{error}</Text>;
  if (!data) return <ActivityIndicator color={theme.accent} />;

  const unreadCount = data.unread.length;
  return (
    <View style={[styles.box, { borderColor: theme.divider, backgroundColor: theme.cardBg }]}>
      <Text style={{ color: theme.text, fontWeight: '800' }}>
        Read by {data.read} of {data.recipients}
      </Text>
      {unreadCount > 0 ? (
        <Pressable onPress={() => setShowList((v) => !v)}>
          <Text style={{ color: theme.accent, fontWeight: '700' }}>
            {showList ? 'Hide' : 'Show'} {unreadCount} who have not read it
          </Text>
        </Pressable>
      ) : (
        <Text style={{ color: '#15803d' }}>Everyone has read it.</Text>
      )}
      {showList
        ? data.unread.map((u, i) => (
            <Text key={`${u.flatNumber}-${i}`} style={{ color: theme.textMuted }}>
              {unitName(u.flatNumber)} · {u.name}
              {u.tenant ? ' (tenant)' : ''}
            </Text>
          ))
        : null}
      {canRemind && unreadCount > 0 ? (
        <Pressable onPress={() => void remind()} disabled={busy} style={[styles.btn, { backgroundColor: theme.accent }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Remind those who have not read</Text>}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6, marginTop: 12 },
  btn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginTop: 4, minHeight: 44, justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
});
