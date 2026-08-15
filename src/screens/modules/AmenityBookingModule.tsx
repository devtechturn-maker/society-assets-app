import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  cancelAmenityBooking,
  createAmenityBooking,
  fetchAmenityBookingDetail,
  fetchAmenityBookings,
} from '../../services/api';
import type { AmenityBookingDetail, AmenityBookingSummary } from '../../types/api';
import { AMENITY_TYPE_OPTIONS } from '../../constants/amenityTypes';
import { useTheme } from '../../theme/ThemeContext';
import { ListEmpty, ListError } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { Badge } from '../../components/dashboard/Badge';
import { UiIcon } from '../../components/UiIcon';
import { useAppAlert } from '../../context/AppAlertContext';
import { useHardwareBack } from '../../hooks/useHardwareBack';

type Screen = 'list' | 'create' | 'detail';

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatSlot(row: AmenityBookingSummary): string {
  return `${row.bookingDate} · ${row.startTime}–${row.endTime}`;
}

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function AmenityBookingModule({
  memberPortal = false,
  canManageBookings = false,
  initialBookingId,
  onInitialBookingConsumed,
}: {
  memberPortal?: boolean;
  canManageBookings?: boolean;
  initialBookingId?: string | null;
  onInitialBookingConsumed?: () => void;
}) {
  const { theme } = useTheme();
  const { alert } = useAppAlert();
  const [screen, setScreen] = useState<Screen>('list');
  const [bookings, setBookings] = useState<AmenityBookingSummary[]>([]);
  const [activeBooking, setActiveBooking] = useState<AmenityBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [amenityType, setAmenityType] = useState<string>('CLUBHOUSE');
  const [bookingDate, setBookingDate] = useState(todayIsoDate());
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [notes, setNotes] = useState('');

  useHardwareBack(
    useCallback(() => {
      if (screen !== 'list') {
        setScreen('list');
        setActiveBooking(null);
        return true;
      }
      return false;
    }, [screen]),
    screen !== 'list'
  );

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAmenityBookings(memberPortal);
      setBookings(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load amenity bookings');
    } finally {
      setLoading(false);
    }
  }, [memberPortal]);

  const openBooking = useCallback(
    async (bookingId: string) => {
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchAmenityBookingDetail(memberPortal, bookingId);
        setActiveBooking(detail);
        setScreen('detail');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load booking');
      } finally {
        setLoading(false);
      }
    },
    [memberPortal]
  );

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    if (!initialBookingId) return;
    void openBooking(initialBookingId);
    onInitialBookingConsumed?.();
  }, [initialBookingId, openBooking, onInitialBookingConsumed]);

  async function submitCreate() {
    if (!memberPortal) return;
    const trimmedDate = bookingDate.trim();
    const trimmedStart = startTime.trim();
    const trimmedEnd = endTime.trim();
    if (!trimmedDate || !trimmedStart || !trimmedEnd) {
      await alert('Missing details', 'Enter date, start time, and end time.');
      return;
    }
    setSaving(true);
    try {
      await createAmenityBooking({
        amenityType,
        bookingDate: trimmedDate,
        startTime: trimmedStart,
        endTime: trimmedEnd,
        notes: notes.trim() || undefined,
      });
      setNotes('');
      setScreen('list');
      await loadBookings();
      await alert('Booked', 'Your amenity booking was saved. Other members will be notified.');
    } catch (err) {
      await alert('Could not book', err instanceof Error ? err.message : 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function submitCancel() {
    if (!activeBooking || activeBooking.status === 'CANCELLED') return;
    const canCancel = memberPortal ? activeBooking.mine : canManageBookings;
    if (!canCancel) return;
    setSaving(true);
    try {
      const updated = await cancelAmenityBooking(memberPortal, activeBooking.bookingId);
      setActiveBooking(updated);
      await loadBookings();
      await alert('Cancelled', 'The booking was cancelled.');
    } catch (err) {
      await alert('Could not cancel', err instanceof Error ? err.message : 'Try again');
    } finally {
      setSaving(false);
    }
  }

  if (screen === 'create') {
    return (
      <ScrollView style={[styles.root, { backgroundColor: theme.pageBg }]} contentContainerStyle={styles.pad}>
        <Pressable onPress={() => setScreen('list')}>
          <Text style={[styles.backLink, { color: theme.accent }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Book amenity</Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Other society members will receive a notification when you confirm this booking.
        </Text>

        <Text style={[styles.label, { color: theme.textMuted }]}>Amenity</Text>
        <View style={styles.chipRow}>
          {AMENITY_TYPE_OPTIONS.map((item) => (
            <Pressable
              key={item.value}
              style={[
                styles.chip,
                {
                  backgroundColor: amenityType === item.value ? theme.accentSoft : theme.chipBg,
                  borderColor: amenityType === item.value ? theme.accent : theme.cardBorder,
                },
              ]}
              onPress={() => setAmenityType(item.value)}
            >
              <Text style={{ color: amenityType === item.value ? theme.accent : theme.text, fontWeight: '600' }}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.textMuted }]}>Date (YYYY-MM-DD)</Text>
        <TextInput
          value={bookingDate}
          onChangeText={setBookingDate}
          placeholder="2026-06-21"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}
        />

        <Text style={[styles.label, { color: theme.textMuted }]}>Start time (HH:mm)</Text>
        <TextInput
          value={startTime}
          onChangeText={setStartTime}
          placeholder="10:00"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}
        />

        <Text style={[styles.label, { color: theme.textMuted }]}>End time (HH:mm)</Text>
        <TextInput
          value={endTime}
          onChangeText={setEndTime}
          placeholder="11:00"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}
        />

        <Text style={[styles.label, { color: theme.textMuted }]}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Purpose or headcount"
          placeholderTextColor={theme.textMuted}
          multiline
          style={[
            styles.input,
            styles.textArea,
            { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.cardBg },
          ]}
        />

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: theme.accent, opacity: saving ? 0.7 : 1 }]}
          disabled={saving}
          onPress={() => void submitCreate()}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Confirm booking</Text>
          )}
        </Pressable>
      </ScrollView>
    );
  }

  if (screen === 'detail' && activeBooking) {
    const canCancel =
      activeBooking.status !== 'CANCELLED' && (canManageBookings || (memberPortal && activeBooking.mine));

    return (
      <ScrollView style={[styles.root, { backgroundColor: theme.pageBg }]} contentContainerStyle={styles.pad}>
        <Pressable onPress={() => setScreen('list')}>
          <Text style={[styles.backLink, { color: theme.accent }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{activeBooking.amenityLabel}</Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>{formatSlot(activeBooking)}</Text>
        {activeBooking.memberName ? (
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            {activeBooking.memberName} · Flat {activeBooking.flatNumber}
          </Text>
        ) : null}
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Status: {activeBooking.status === 'CANCELLED' ? 'Cancelled' : 'Confirmed'}
        </Text>
        {activeBooking.notes ? (
          <View style={[styles.noteBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Notes</Text>
            <Text style={{ color: theme.text }}>{activeBooking.notes}</Text>
          </View>
        ) : null}
        {canCancel ? (
          <Pressable
            style={[styles.dangerBtn, { borderColor: theme.danger, opacity: saving ? 0.7 : 1 }]}
            disabled={saving}
            onPress={() => void submitCancel()}
          >
            {saving ? (
              <ActivityIndicator color={theme.danger} />
            ) : (
              <Text style={[styles.dangerBtnText, { color: theme.danger }]}>Cancel booking</Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.pageBg }]}>
      <View style={styles.listHead}>
        <SectionCard
          title="Amenity bookings"
          subtitle={
            memberPortal
              ? 'Book shared facilities and see what others have reserved.'
              : 'View amenity bookings made by members.'
          }
        >
          {memberPortal ? (
            <Pressable
              style={({ pressed }) => [
                styles.createBar,
                { backgroundColor: theme.accent, opacity: pressed ? 0.88 : 1 },
              ]}
              onPress={() => setScreen('create')}
            >
              <UiIcon name="plus" size={16} color="#fff" />
              <Text style={styles.createBarText}>Book Amenity</Text>
            </Pressable>
          ) : null}
        </SectionCard>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={theme.accent} />
      ) : error ? (
        <ListError message={error} onRetry={() => void loadBookings()} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.bookingId}
          contentContainerStyle={bookings.length === 0 ? styles.emptyList : styles.listPad}
          ListEmptyComponent={
            <ListEmpty
              icon="calendar"
              title="No bookings yet"
              subtitle={
                memberPortal
                  ? 'Tap Book Amenity to reserve a clubhouse, gym, pool, or other facility.'
                  : 'Member bookings will appear here.'
              }
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.cardBorder,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
              onPress={() => void openBooking(item.bookingId)}
            >
              <View style={[styles.rowIconHalo, { backgroundColor: theme.accentSoft }]}>
                <UiIcon name="calendar" size={18} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{item.amenityLabel}</Text>
                <Text style={[styles.rowMeta, { color: theme.textMuted }]}>{formatSlot(item)}</Text>
                {item.memberName ? (
                  <Text style={[styles.rowMeta, { color: theme.textMuted }]}>
                    {item.memberName} · {item.flatNumber}
                  </Text>
                ) : null}
              </View>
              <Badge
                label={item.status === 'CANCELLED' ? 'Cancelled' : 'Confirmed'}
                tone={item.status === 'CANCELLED' ? 'neutral' : 'success'}
              />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: 16, paddingBottom: 32, gap: 10 },
  listPad: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  emptyList: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 24 },
  backLink: { fontWeight: '700', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  meta: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  label: { fontSize: 13, fontWeight: '700', marginTop: 8, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  primaryBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  dangerBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerBtnText: { fontWeight: '700' },
  noteBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  listHead: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  createBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  createBarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  row: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIconHalo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 13, marginTop: 2 },
  status: { fontSize: 12, fontWeight: '800' },
});
