import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchMemberEvents, fetchSocietyEvents } from '../../services/api';
import type { SocietyEventListItem } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useHardwareBack } from '../../hooks/useHardwareBack';
import { apiErrorMessage } from '../../utils/apiError';
import { compactInr } from '../../utils/eventFormat';
import { ListEmpty, ListError, ListLoading } from '../../components/dashboard/ListStates';
import { EventCard } from '../../components/events/EventCard';
import { CreateEventSheet } from '../../components/events/CreateEventSheet';
import { EventManageView } from '../../components/events/EventManageView';
import { MemberEventView } from '../../components/events/MemberEventView';

type Selection = { eventId: string; mode: 'manage' | 'member' } | null;

/**
 * Events & festivals.
 * Staff (chairman / treasurer): all events with management.
 * Members: transparent summary + own contribution; committee members can switch to "manage".
 */
export function EventsModule({
  memberPortal = false,
  initialEventId,
  onInitialEventConsumed,
}: {
  memberPortal?: boolean;
  initialEventId?: string | null;
  onInitialEventConsumed?: () => void;
}) {
  const { theme } = useTheme();
  const [events, setEvents] = useState<SocietyEventListItem[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selection>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      if (memberPortal) {
        setEvents(await fetchMemberEvents());
        setCanCreate(false);
      } else {
        const result = await fetchSocietyEvents();
        setEvents(result.events);
        setCanCreate(result.canCreate);
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load events'));
    } finally {
      setLoading(false);
    }
  }, [memberPortal]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!initialEventId) return;
    setSelected({ eventId: initialEventId, mode: memberPortal ? 'member' : 'manage' });
    onInitialEventConsumed?.();
  }, [initialEventId, memberPortal, onInitialEventConsumed]);

  useHardwareBack(
    useCallback(() => {
      if (selected) {
        setSelected(null);
        void load();
        return true;
      }
      return false;
    }, [selected, load]),
    selected !== null
  );

  const groups = useMemo(() => {
    const byYear = new Map<string, SocietyEventListItem[]>();
    for (const event of events) {
      const year = (event.startDate ?? '').slice(0, 4) || 'Other';
      byYear.set(year, [...(byYear.get(year) ?? []), event]);
    }
    return [...byYear.entries()];
  }, [events]);

  const openCount = events.filter((e) => e.status === 'PLANNED').length;
  const attention = events.reduce((sum, e) => sum + (e.needsAttentionCount ?? 0), 0);

  if (selected?.mode === 'manage') {
    return (
      <EventManageView
        eventId={selected.eventId}
        onBack={() => {
          setSelected(memberPortal ? { eventId: selected.eventId, mode: 'member' } : null);
          void load();
        }}
        onChanged={() => void load()}
      />
    );
  }
  if (selected?.mode === 'member') {
    return (
      <MemberEventView
        eventId={selected.eventId}
        onBack={() => {
          setSelected(null);
          void load();
        }}
        onManage={() => setSelected({ eventId: selected.eventId, mode: 'manage' })}
        onChanged={() => void load()}
      />
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: theme.pageBg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.head}>
          <View style={styles.headIcon}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>Events & Festivals</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {memberPortal ? 'See how celebration money is collected and spent' : 'Collections, expenses and balance per event'}
            </Text>
          </View>
        </View>

        {!memberPortal && events.length > 0 ? (
          <View style={[styles.summary, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <Text style={[styles.summaryText, { color: theme.textSoft }]}>
              <Text style={{ fontWeight: '800', color: theme.text }}>{openCount}</Text> open ·{' '}
              balance <Text style={{ fontWeight: '800', color: theme.text }}>
                {compactInr(events.filter((e) => e.status === 'PLANNED').reduce((s, e) => s + e.balance, 0))}
              </Text>
            </Text>
            {attention > 0 ? (
              <Text style={styles.summaryAlert}>
                <Ionicons name="notifications-outline" size={13} /> {attention} to review
              </Text>
            ) : null}
          </View>
        ) : null}

        {loading ? (
          <ListLoading />
        ) : error ? (
          <ListError message={error} onRetry={() => void load()} />
        ) : events.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <ListEmpty
              icon="calendar"
              title="No events yet"
              subtitle={
                canCreate
                  ? 'Create Navratri, Diwali, an annual function or any event to track contributions and expenses.'
                  : 'When your committee starts an event, its collections and spending will appear here.'
              }
            />
            {canCreate ? (
              <Pressable onPress={() => setCreateOpen(true)} style={[styles.primaryBtn, { backgroundColor: theme.accent }]} accessibilityRole="button">
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Create your first event</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          groups.map(([year, rows]) => (
            <View key={year}>
              <Text style={[styles.year, { color: theme.textMuted }]}>{year}</Text>
              {rows.map((event) => (
                <EventCard
                  key={event.eventId}
                  event={event}
                  memberView={memberPortal}
                  onPress={() => setSelected({ eventId: event.eventId, mode: memberPortal ? 'member' : 'manage' })}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {canCreate && events.length > 0 ? (
        <Pressable
          onPress={() => setCreateOpen(true)}
          style={[styles.fab, { backgroundColor: theme.accent }]}
          accessibilityRole="button"
          accessibilityLabel="Create event"
        >
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      ) : null}

      <CreateEventSheet
        visible={createOpen}
        previousEvents={events}
        onClose={() => setCreateOpen(false)}
        onCreated={(detail) => {
          void load();
          setSelected({ eventId: detail.eventId, mode: 'manage' });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 110 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  headIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 2 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 6,
  },
  summaryText: { fontSize: 14 },
  summaryAlert: { color: '#b45309', fontWeight: '800', fontSize: 13 },
  year: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 10, marginBottom: 8 },
  empty: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 10 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, paddingVertical: 13 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
  },
});
