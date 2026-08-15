import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchChairmanVisitorHistory, fetchGateKeeperVisitorHistory, fetchMemberVisitorHistory } from '../../services/api';
import type { VisitorPhotoPortal } from '../../utils/visitorPhoto';
import type { VisitorSummary } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { ListEmpty, ListError } from '../../components/dashboard/ListStates';
import { VisitorDateCalendarModal } from '../../components/visitor/VisitorDateCalendarModal';
import {
  groupVisitorsByFlat,
  VisitorFlatAccordion,
} from '../../components/visitor/VisitorFlatAccordion';
import { VisitorHistoryRow } from '../../components/visitor/VisitorHistoryRow';
import {
  defaultVisitorDateSelection,
  resolveDateSelectionBounds,
  visitorDatePeriodLabel,
  visitorDateSelectionLabel,
  type VisitorDateSelection,
} from '../../utils/visitorHistoryDate';

const ALL_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING_APPROVAL', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'CHECKED_IN', label: 'Checked in' },
  { value: 'CHECKED_OUT', label: 'Checked out' },
  { value: 'REJECTED', label: 'Rejected' },
] as const;

const SECURITY_DESK_HIDDEN_STATUSES = new Set(['CHECKED_IN', 'CHECKED_OUT']);

function filtersForSecurityDesk() {
  return ALL_FILTERS.filter((f) => !SECURITY_DESK_HIDDEN_STATUSES.has(f.value));
}

function filtersForMember() {
  return filtersForSecurityDesk();
}

export function VisitorHistoryModule({
  gateKeeper = true,
  chairman = false,
  member = false,
  embedded = false,
  onVisitorPress,
  onVisitorResolved,
}: {
  gateKeeper?: boolean;
  chairman?: boolean;
  member?: boolean;
  embedded?: boolean;
  onVisitorPress?: (visitorId: string) => void;
  onVisitorResolved?: () => void;
}) {
  const { theme } = useTheme();
  const memberMode = member === true;
  const securityDesk = gateKeeper || chairman || memberMode;
  const useFlatGroups = securityDesk;
  const photoPortal: VisitorPhotoPortal = chairman ? 'society' : gateKeeper ? 'gatekeeper' : 'member';
  const expandablePhotos = !securityDesk;
  const [items, setItems] = useState<VisitorSummary[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [dateSelection, setDateSelection] = useState<VisitorDateSelection>(defaultVisitorDateSelection);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [expandedFlats, setExpandedFlats] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filters = securityDesk ? filtersForSecurityDesk() : filtersForMember();
  const grouped = useMemo(() => (useFlatGroups ? groupVisitorsByFlat(items) : []), [useFlatGroups, items]);
  const dateFilterActive = dateSelection.mode !== 'today';

  useEffect(() => {
    if (securityDesk && SECURITY_DESK_HIDDEN_STATUSES.has(status)) {
      setStatus('');
    }
  }, [securityDesk, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = resolveDateSelectionBounds(dateSelection);
      const fetcher = chairman
        ? fetchChairmanVisitorHistory
        : memberMode
          ? fetchMemberVisitorHistory
          : gateKeeper
            ? fetchGateKeeperVisitorHistory
            : fetchMemberVisitorHistory;
      const page = await fetcher({
        status: status || undefined,
        search: search || undefined,
        from,
        to,
        page: 0,
        size: 100,
      });
      setItems(page.items);
      setExpandedFlats(new Set(page.items.map((visitor) => visitor.flatNumber)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [chairman, dateSelection, gateKeeper, memberMode, search, status]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const clearDateFilter = useCallback(() => {
    setDateSelection(defaultVisitorDateSelection());
  }, []);

  const toggleFlat = useCallback((flatNumber: string) => {
    setExpandedFlats((current) => {
      const next = new Set(current);
      if (next.has(flatNumber)) {
        next.delete(flatNumber);
      } else {
        next.add(flatNumber);
      }
      return next;
    });
  }, []);

  const listHeader = (
    <View style={embedded ? styles.embeddedHeader : styles.header}>
      {!embedded ? (
        <Text style={[styles.title, { color: theme.text }]}>Visitor history</Text>
      ) : null}

      <Text style={[styles.periodLabel, { color: theme.textMuted }]}>
        {visitorDatePeriodLabel(dateSelection)}
      </Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={memberMode ? 'Search name or mobile…' : 'Search name, mobile, flat…'}
        placeholderTextColor={theme.placeholder}
        style={[
          styles.search,
          { color: theme.inputText, borderColor: theme.inputBorder, backgroundColor: theme.inputBg },
        ]}
      />

      <View style={styles.filters}>
        {filters.map((f) => {
          const active = status === f.value;
          return (
            <Pressable
              key={f.value || 'ALL'}
              onPress={() => setStatus(f.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.chipActiveBg : theme.chipBg,
                  borderColor: active ? theme.chipActiveBorder : theme.chipBorder,
                },
              ]}
            >
              <Text style={{ color: active ? theme.accent : theme.text, fontWeight: '600', fontSize: 12 }}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
        <View
          style={[
            styles.chip,
            styles.dateChip,
            {
              backgroundColor: dateFilterActive ? theme.chipActiveBg : theme.chipBg,
              borderColor: dateFilterActive ? theme.chipActiveBorder : theme.chipBorder,
            },
          ]}
        >
          <Pressable onPress={() => setCalendarOpen(true)}>
            <Text
              style={{
                color: dateFilterActive ? theme.accent : theme.text,
                fontWeight: '600',
                fontSize: 12,
              }}
            >
              {visitorDateSelectionLabel(dateSelection)}
            </Text>
          </Pressable>
          {dateFilterActive ? (
            <Pressable onPress={clearDateFilter} hitSlop={8} accessibilityLabel="Remove date filter">
              <Ionicons name="close-circle" size={16} color={theme.accent} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {error ? <ListError message={error} onRetry={load} /> : null}
    </View>
  );

  if (loading && items.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.pageBg }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  const rowProps = {
    photoPortal,
    expandable: expandablePhotos,
    memberPendingActions: memberMode,
    onResolved: onVisitorResolved ?? load,
    onPress: onVisitorPress ? (visitorId: string) => onVisitorPress(visitorId) : undefined,
  };

  if (useFlatGroups) {
    return (
      <>
        <FlatList
          style={[styles.flex, { backgroundColor: theme.pageBg }]}
          contentContainerStyle={styles.listContent}
          data={grouped}
          keyExtractor={(item) => item.flatNumber}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={<ListEmpty message="No visitors found for this date" />}
          renderItem={({ item }) => (
            <VisitorFlatAccordion
              group={item}
              expanded={expandedFlats.has(item.flatNumber)}
              photoPortal={photoPortal}
              expandablePhotos={expandablePhotos}
              memberPendingActions={memberMode}
              onVisitorPress={onVisitorPress}
              onVisitorResolved={onVisitorResolved ?? load}
              onToggle={() => toggleFlat(item.flatNumber)}
            />
          )}
          keyboardShouldPersistTaps="handled"
        />
        <VisitorDateCalendarModal
          visible={calendarOpen}
          selection={dateSelection}
          onClose={() => setCalendarOpen(false)}
          onApply={(next) => {
            setDateSelection(next);
            setCalendarOpen(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <FlatList
        style={[styles.flex, { backgroundColor: theme.pageBg }]}
        contentContainerStyle={styles.listContent}
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<ListEmpty message="No visitors found for this date" />}
        renderItem={({ item }) => (
          <VisitorHistoryRow
            item={item}
            photoPortal={rowProps.photoPortal}
            expandable={rowProps.expandable}
            memberPendingActions={rowProps.memberPendingActions}
            onResolved={rowProps.onResolved}
            onPress={rowProps.onPress ? () => rowProps.onPress!(item.id) : undefined}
          />
        )}
        keyboardShouldPersistTaps="handled"
      />
      <VisitorDateCalendarModal
        visible={calendarOpen}
        selection={dateSelection}
        onClose={() => setCalendarOpen(false)}
        onApply={(next) => {
          setDateSelection(next);
          setCalendarOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 8 },
  embeddedHeader: { marginBottom: 8, paddingHorizontal: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  periodLabel: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    marginBottom: 12,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1 },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
