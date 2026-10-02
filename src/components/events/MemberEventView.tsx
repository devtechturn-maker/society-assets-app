import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { downloadEventReport, fetchMemberEventDetail } from '../../services/api';
import type { MemberEventDetail } from '../../types/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useTheme } from '../../theme/ThemeContext';
import { apiErrorMessage } from '../../utils/apiError';
import {
  contributionLabel,
  contributionTone,
  dateRange,
  entryStatusLabel,
  eventTypeLabel,
  paymentMethodLabel,
  phaseLabel,
  shortDate,
} from '../../utils/eventFormat';
import { formatInr } from '../../utils/format';
import { Badge } from '../dashboard/Badge';
import { ListError, ListLoading } from '../dashboard/ListStates';
import { SectionCard } from '../dashboard/SectionCard';
import { AmountBar } from './EventSheet';
import { MemberPaySheet } from './MemberPaySheet';

/** Member transparency view: where money came from, where it went, what remains — plus "my contribution". */
export function MemberEventView({
  eventId,
  onBack,
  onManage,
  onChanged,
}: {
  eventId: string;
  onBack: () => void;
  onManage?: () => void;
  onChanged?: () => void;
}) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [detail, setDetail] = useState<MemberEventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setDetail(await fetchMemberEventDetail(eventId));
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load this event'));
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function shareSummary() {
    try {
      const file = await downloadEventReport(eventId, 'SUMMARY', true);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: detail?.name });
      }
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not download the summary'), 'error');
    }
  }

  const back = (
    <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back to events">
      <Ionicons name="chevron-back" size={22} color={theme.accent} />
      <Text style={[styles.backText, { color: theme.accent }]}>Events</Text>
    </Pressable>
  );

  if (error && !detail) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.pageBg, padding: 16 }]}>
        {back}
        <ListError message={error} onRetry={() => void load()} />
      </View>
    );
  }
  if (!detail) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.pageBg, padding: 16 }]}>
        {back}
        <ListLoading />
      </View>
    );
  }

  const ev = detail;
  const mine = ev.myContribution;
  const voluntary = !ev.contributionRequired;
  const incomeMax = Math.max(1, ...ev.incomeByCategory.map((row) => row.amount));
  const expenseMax = Math.max(1, ...ev.expenseByCategory.map((row) => row.amount));
  const expenses = showAllExpenses ? ev.expenses : ev.expenses.slice(0, 6);
  const canPay = ev.canSubmitPayment && mine && (voluntary || mine.remaining - mine.pendingVerification > 0);

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
        <View style={styles.topRow}>
          {back}
          <Pressable
            onPress={() => void shareSummary()}
            style={[styles.pill, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
            accessibilityRole="button"
            accessibilityLabel="Share financial summary"
          >
            <Ionicons name="share-outline" size={16} color={theme.text} />
            <Text style={[styles.pillText, { color: theme.text }]}>Summary</Text>
          </Pressable>
        </View>

        <LinearGradient colors={['#c2410c', '#ea580c', '#f59e0b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{ev.name}</Text>
              <Text style={styles.heroMeta}>
                {eventTypeLabel(ev)}
                {ev.startDate ? ` · ${dateRange(ev.startDate, ev.endDate)}` : ''}
              </Text>
            </View>
            <View style={styles.heroPhase}>
              <Text style={styles.heroPhaseText}>{phaseLabel(ev.phase)}</Text>
            </View>
          </View>
          <View style={styles.heroGrid}>
            <HeroCell label="Collected" value={formatInr(ev.totals.collected)} />
            <HeroCell label="Spent" value={formatInr(ev.totals.spent)} />
            <HeroCell label="Balance" value={formatInr(ev.totals.balance)} strong />
          </View>
          {ev.contributionRequired && ev.totals.flatCount > 0 ? (
            <Text style={styles.heroFoot}>
              {ev.totals.paidCount} of {Math.max(0, ev.totals.flatCount - ev.totals.exemptCount)} flats have contributed
            </Text>
          ) : null}
        </LinearGradient>

        {mine ? (
          <SectionCard
            title="My contribution"
            subtitle={`Flat ${mine.flatNumber}`}
            headerRight={
              <Badge
                label={mine.pendingVerification > 0 && mine.status !== 'PAID' ? 'Verifying' : contributionLabel(mine.status, voluntary)}
                tone={mine.pendingVerification > 0 && mine.status !== 'PAID' ? 'info' : contributionTone(mine.status)}
              />
            }
          >
            <View style={styles.mineGrid}>
              <MineCell label={voluntary ? 'Suggested' : 'Expected'} value={formatInr(mine.expected)} />
              <MineCell label="Paid" value={formatInr(mine.paid)} color="#16a34a" />
              <MineCell label="Remaining" value={formatInr(mine.remaining)} color={mine.remaining > 0 ? '#d97706' : undefined} />
            </View>
            {mine.pendingVerification > 0 ? (
              <Text style={[styles.small, { color: theme.textMuted }]}>
                {formatInr(mine.pendingVerification)} submitted — the committee will verify it soon.
              </Text>
            ) : null}
            {(mine.payments ?? []).length > 0 ? (
              <View style={[styles.payments, { borderTopColor: theme.divider }]}>
                {(mine.payments ?? []).map((p) => (
                  <View key={p.transactionId} style={styles.paymentRow}>
                    <Text style={[styles.paymentText, { color: theme.textSoft }]}>
                      {shortDate(p.txnDate)} · {paymentMethodLabel(p.paymentMethod)}
                      {p.referenceNo ? ` · ${p.referenceNo}` : ''}
                    </Text>
                    <Text style={[styles.paymentAmount, { color: theme.text }]}>{formatInr(p.amount)}</Text>
                    {p.status !== 'CONFIRMED' ? <Badge label={entryStatusLabel(p.status)} tone={p.status === 'PENDING_VERIFICATION' ? 'info' : 'neutral'} /> : null}
                  </View>
                ))}
              </View>
            ) : null}
            {canPay ? (
              <Pressable onPress={() => setPayOpen(true)} style={[styles.payBtn, { backgroundColor: theme.accent }]} accessibilityRole="button">
                <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                <Text style={styles.payBtnText}>I have paid online</Text>
              </Pressable>
            ) : null}
          </SectionCard>
        ) : null}

        <SectionCard title="Where money came from">
          {ev.incomeByCategory.length === 0 ? (
            <Text style={{ color: theme.textMuted }}>No collections yet.</Text>
          ) : (
            <View style={styles.bars}>
              {ev.incomeByCategory.map((row) => (
                <AmountBar key={row.categoryCode} label={row.label} amount={formatInr(row.amount)} percent={(row.amount / incomeMax) * 100} color="#16a34a" />
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard title="Where money went">
          {ev.expenseByCategory.length === 0 ? (
            <Text style={{ color: theme.textMuted }}>No expenses yet.</Text>
          ) : (
            <View style={styles.bars}>
              {ev.expenseByCategory.map((row) => (
                <AmountBar key={row.categoryCode} label={row.label} amount={formatInr(row.amount)} percent={(row.amount / expenseMax) * 100} color="#ea580c" />
              ))}
            </View>
          )}
        </SectionCard>

        {ev.expenses.length > 0 ? (
          <SectionCard title="Expenses" subtitle={`${ev.expenses.length} paid item(s)`}>
            {expenses.map((row, index) => (
              <View
                key={`${row.txnDate}-${index}`}
                style={[styles.expenseRow, index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.divider } : null]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.expenseTitle, { color: theme.text }]} numberOfLines={1}>
                    {row.description || row.paidTo || row.categoryLabel}
                  </Text>
                  <Text style={[styles.small, { color: theme.textMuted }]} numberOfLines={1}>
                    {row.categoryLabel}
                    {row.paidTo ? ` · ${row.paidTo}` : ''} · {shortDate(row.txnDate)}
                  </Text>
                </View>
                <Text style={[styles.expenseAmount, { color: theme.text }]}>{formatInr(row.amount)}</Text>
              </View>
            ))}
            {ev.expenses.length > 6 ? (
              <Pressable onPress={() => setShowAllExpenses((v) => !v)} style={styles.more}>
                <Text style={{ color: theme.accent, fontWeight: '700' }}>{showAllExpenses ? 'Show less' : `Show all ${ev.expenses.length}`}</Text>
              </Pressable>
            ) : null}
          </SectionCard>
        ) : null}

        {ev.contributorList && ev.contributorList.length > 0 ? (
          <SectionCard title="Flats" subtitle="Shared by the committee">
            <View style={styles.flatGrid}>
              {ev.contributorList.map((row) => (
                <View
                  key={row.flatNumber}
                  style={[
                    styles.flatChip,
                    { backgroundColor: row.status === 'PAID' ? '#dcfce7' : row.status === 'EXEMPT' ? theme.chipBg : '#fef3c7' },
                  ]}
                >
                  <Text style={[styles.flatChipText, { color: row.status === 'PAID' ? '#047857' : row.status === 'EXEMPT' ? theme.textMuted : '#92400e' }]}>
                    {row.flatNumber}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>
        ) : null}

        {ev.committee.length > 0 ? (
          <SectionCard title="Organised by">
            <Text style={{ color: theme.textSoft, lineHeight: 20 }}>
              {ev.committee.map((p) => `${p.name} (${p.flatNumber})`).join(', ')}
            </Text>
          </SectionCard>
        ) : null}

        {ev.canManage && onManage ? (
          <Pressable onPress={onManage} style={[styles.manageBtn, { borderColor: theme.accent }]} accessibilityRole="button">
            <Ionicons name="shield-checkmark-outline" size={18} color={theme.accent} />
            <Text style={[styles.manageText, { color: theme.accent }]}>Manage this event (committee)</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {mine ? (
        <MemberPaySheet
          visible={payOpen}
          eventId={eventId}
          eventName={ev.name}
          remaining={Math.max(0, mine.remaining - mine.pendingVerification)}
          onClose={() => setPayOpen(false)}
          onSubmitted={() => {
            void load();
            onChanged?.();
          }}
        />
      ) : null}
    </View>
  );
}

function HeroCell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={[styles.heroCell, strong ? styles.heroCellStrong : null]}>
      <Text style={styles.heroCellLabel}>{label}</Text>
      <Text style={styles.heroCellValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function MineCell({ label, value, color }: { label: string; value: string; color?: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.mineCell}>
      <Text style={[styles.mineLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.mineValue, { color: color ?? theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  backText: { fontSize: 15, fontWeight: '700' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  pillText: { fontSize: 13, fontWeight: '700' },
  hero: { borderRadius: 22, padding: 18, gap: 12 },
  heroTop: { flexDirection: 'row', gap: 10 },
  heroName: { color: '#fff', fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  heroMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  heroPhase: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  heroPhaseText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  heroGrid: { flexDirection: 'row', gap: 8 },
  heroCell: { flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 14, padding: 10, gap: 3 },
  heroCellStrong: { backgroundColor: 'rgba(255,255,255,0.28)' },
  heroCellLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase' },
  heroCellValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  heroFoot: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  mineGrid: { flexDirection: 'row', gap: 8 },
  mineCell: { flex: 1, gap: 3 },
  mineLabel: { fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase' },
  mineValue: { fontSize: 18, fontWeight: '800' },
  small: { fontSize: 12.5, marginTop: 4 },
  payments: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 10, gap: 8 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paymentText: { flex: 1, fontSize: 13 },
  paymentAmount: { fontSize: 14, fontWeight: '700' },
  payBtn: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 13 },
  payBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  bars: { gap: 12 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  expenseTitle: { fontSize: 14.5, fontWeight: '700' },
  expenseAmount: { fontSize: 14.5, fontWeight: '800' },
  more: { alignItems: 'center', paddingTop: 10 },
  flatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  flatChip: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  flatChipText: { fontSize: 12.5, fontWeight: '700' },
  manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 14, paddingVertical: 13 },
  manageText: { fontSize: 15, fontWeight: '800' },
});
