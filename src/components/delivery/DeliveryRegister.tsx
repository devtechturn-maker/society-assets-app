import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { fetchDeliveryRegister, handOverParcel, keepParcelAtGate } from '../../services/api';
import type { DeliveryRegister as Register, VisitorSummary } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { ListEmpty, ListError } from '../dashboard/ListStates';
import { apiErrorMessage } from '../../utils/apiError';
import { formatDateTime } from '../../utils/format';
import { unitName } from '../../utils/unitName';
import { ModalKeyboardAvoidingView } from '../KeyboardSafeView';

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDay(day: string, by: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return isoDay(new Date(y, m - 1, d + by));
}

/** States from which the guard can still keep the parcel: nobody refused it and it is not finished. */
const KEEPABLE = new Set(['PENDING_APPROVAL', 'APPROVED', 'CHECKED_IN', 'EXPIRED']);

/**
 * The day's delivery register and the parcels waiting at the gate. The guard can keep a parcel and hand it over;
 * the society office only looks.
 */
export function DeliveryRegister({ office = false }: { office?: boolean }) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const today = isoDay(new Date());
  const [day, setDay] = useState(today);
  const [data, setData] = useState<Register | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [handing, setHanding] = useState<VisitorSummary | null>(null);
  const [collectedBy, setCollectedBy] = useState('');

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      try {
        setData(await fetchDeliveryRegister(office, day));
        setError(null);
      } catch (e) {
        setError(apiErrorMessage(e, 'Could not load deliveries'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [office, day]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function keep(item: VisitorSummary) {
    setBusyId(item.id);
    try {
      await keepParcelAtGate(item.id);
      toast(`Parcel for ${unitName(item.flatNumber)} kept at the gate. The resident is notified.`, 'success');
      void load('refresh');
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not keep the parcel'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handOver() {
    if (!handing) return;
    const name = collectedBy.trim();
    if (name.length < 2) {
      toast('Enter who collected the parcel', 'error');
      return;
    }
    setBusyId(handing.id);
    try {
      await handOverParcel(handing.id, name);
      toast('Handed over. The resident is notified.', 'success');
      setHanding(null);
      setCollectedBy('');
      void load('refresh');
    } catch (e) {
      toast(apiErrorMessage(e, 'Could not hand over'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  function row(item: VisitorSummary, waitingList: boolean) {
    const atGate = item.parcelStatus === 'AT_GATE';
    const canKeep = !office && !item.parcelStatus && KEEPABLE.has(item.status);
    return (
      <View key={`${waitingList ? 'w' : 'd'}-${item.id}`} style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <View style={styles.cardTop}>
          <Text style={[styles.flat, { color: theme.text }]}>{unitName(item.flatNumber)}</Text>
          <Text style={{ color: theme.textMuted, fontWeight: '700' }}>{item.deliveryCompany ?? 'Delivery'}</Text>
        </View>
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>
          {item.residentName} · {item.visitorName} · {item.mobileNumber}
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>Arrived {formatDateTime(item.createdAt)}</Text>
        {atGate ? (
          <Text style={{ color: '#b45309', fontWeight: '700', fontSize: 13 }}>
            At the gate since {formatDateTime(item.parcelKeptAt ?? null)}
          </Text>
        ) : null}
        {item.parcelStatus === 'COLLECTED' ? (
          <Text style={{ color: '#15803d', fontWeight: '700', fontSize: 13 }}>
            Collected by {item.collectedByName} · {formatDateTime(item.collectedAt ?? null)}
          </Text>
        ) : null}
        {!item.parcelStatus ? (
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>Status: {item.status.replace(/_/g, ' ').toLowerCase()}</Text>
        ) : null}
        {!office && (atGate || canKeep) ? (
          <View style={styles.actions}>
            {canKeep ? (
              <Pressable
                onPress={() => void keep(item)}
                disabled={busyId === item.id}
                style={[styles.secondary, { borderColor: theme.accent }]}
              >
                {busyId === item.id ? (
                  <ActivityIndicator color={theme.accent} />
                ) : (
                  <Text style={{ color: theme.accent, fontWeight: '800' }}>Keep at gate</Text>
                )}
              </Pressable>
            ) : null}
            {atGate ? (
              <Pressable
                onPress={() => {
                  setCollectedBy('');
                  setHanding(item);
                }}
                style={[styles.primary, { backgroundColor: '#15803d' }]}
              >
                <Text style={styles.primaryText}>Handed over</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} />}
      >
        <View style={styles.dayRow}>
          <Pressable onPress={() => setDay((d) => shiftDay(d, -1))} style={styles.dayBtn} accessibilityLabel="Previous day">
            <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 18 }}>‹</Text>
          </Pressable>
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>{day === today ? `Today · ${day}` : day}</Text>
          <Pressable
            onPress={() => setDay((d) => (d >= today ? d : shiftDay(d, 1)))}
            disabled={day >= today}
            style={[styles.dayBtn, { opacity: day >= today ? 0.3 : 1 }]}
            accessibilityLabel="Next day"
          >
            <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 18 }}>›</Text>
          </Pressable>
        </View>

        {loading ? <ActivityIndicator style={{ marginTop: 24 }} color={theme.accent} /> : null}
        {error ? <ListError message={error} onRetry={() => void load()} /> : null}

        {data && !loading ? (
          <>
            <View style={styles.stats}>
              {[
                { label: 'Deliveries', value: data.count },
                { label: 'Delivery people', value: data.couriers },
                { label: 'At the gate', value: data.atGateCount },
              ].map((s) => (
                <View key={s.label} style={[styles.stat, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                  <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>{s.value}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>{s.label}</Text>
                </View>
              ))}
            </View>

            {data.atGate.length > 0 ? (
              <>
                <Text style={[styles.section, { color: theme.text }]}>Waiting at the gate</Text>
                {data.atGate.map((item) => row(item, true))}
              </>
            ) : null}

            <Text style={[styles.section, { color: theme.text }]}>Deliveries on this day</Text>
            {data.items.length === 0 ? <ListEmpty icon="flag" message="No deliveries on this day." /> : null}
            {data.items.map((item) => row(item, false))}
          </>
        ) : null}
      </ScrollView>

      <Modal visible={!!handing} transparent animationType="fade" onRequestClose={() => setHanding(null)}>
        <ModalKeyboardAvoidingView style={styles.backdrop}>
          <View style={[styles.dialog, { backgroundColor: theme.cardBg }]}>
            <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>Hand over parcel</Text>
            <Text style={{ color: theme.textMuted }}>
              {handing ? `${unitName(handing.flatNumber)} · ${handing.deliveryCompany ?? ''}` : ''}
            </Text>
            <TextInput
              value={collectedBy}
              onChangeText={setCollectedBy}
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.inputBorder }]}
              placeholder="Collected by (name)"
              placeholderTextColor={theme.placeholder}
              maxLength={120}
              autoFocus
            />
            <View style={styles.actions}>
              <Pressable onPress={() => setHanding(null)} style={[styles.secondary, { borderColor: theme.cardBorder }]}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => void handOver()} disabled={!!busyId} style={[styles.primary, { backgroundColor: '#15803d' }]}>
                {busyId ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Hand over</Text>}
              </Pressable>
            </View>
          </View>
        </ModalKeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 40, gap: 10 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayBtn: { padding: 10, minWidth: 44, alignItems: 'center' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  section: { fontSize: 15, fontWeight: '800', marginTop: 8 },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  flat: { fontSize: 16, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  secondary: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 11, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  primary: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: 20 },
  dialog: { borderRadius: 18, padding: 18, gap: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
});
