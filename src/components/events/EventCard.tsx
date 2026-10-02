import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../dashboard/Badge';
import { useTheme } from '../../theme/ThemeContext';
import type { SocietyEventListItem } from '../../types/api';
import {
  compactInr,
  contributionLabel,
  contributionTone,
  dateRange,
  eventTypeIcon,
  eventTypeLabel,
  phaseLabel,
  phaseTone,
} from '../../utils/eventFormat';

const IN_COLOR = '#16a34a';
const OUT_COLOR = '#dc2626';

/** "Navratri 2026 · ₹85K collected · ₹67.5K spent · ₹17.5K balance" at a glance. */
export function EventCard({
  event,
  onPress,
  memberView = false,
}: {
  event: SocietyEventListItem;
  onPress: () => void;
  memberView?: boolean;
}) {
  const { theme } = useTheme();
  const mine = event.myContribution;
  const open = event.status === 'PLANNED';
  const progress = Math.max(0, Math.min(100, event.collectionProgress ?? 0));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.name}, collected ${compactInr(event.collected)}, balance ${compactInr(event.balance)}`}
      style={({ pressed }) => [
        styles.card,
        styles.shadow,
        { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={styles.top}>
        <View style={styles.icon}>
          <Ionicons name={eventTypeIcon(event.eventType)} size={20} color="#ea580c" />
        </View>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {event.name}
          </Text>
          <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>
            {eventTypeLabel(event)}
            {event.startDate ? ` · ${dateRange(event.startDate, event.endDate)}` : ''}
          </Text>
        </View>
        <Badge label={phaseLabel(event.phase)} tone={phaseTone(event.phase)} />
      </View>

      <View style={[styles.money, { backgroundColor: theme.chipBg }]}>
        <Money label="Collected" value={compactInr(event.collected)} color={event.collected > 0 ? IN_COLOR : theme.text} />
        <Money label="Spent" value={compactInr(event.spent)} color={event.spent > 0 ? OUT_COLOR : theme.text} />
        <Money label="Balance" value={compactInr(event.balance)} color={event.balance < 0 ? OUT_COLOR : theme.text} />
      </View>

      {event.contributionRequired && event.flatCount > 0 ? (
        <View style={styles.progressWrap}>
          <View style={[styles.track, { backgroundColor: theme.chipBg }]}>
            <View style={[styles.fill, { width: `${progress}%` }]} />
          </View>
          <Text style={[styles.progressText, { color: theme.textMuted }]}>
            {event.paidCount}/{Math.max(0, event.flatCount - event.exemptCount)} flats paid
            {event.pendingContribution > 0 ? ` · ${compactInr(event.pendingContribution)} pending` : ''}
          </Text>
        </View>
      ) : null}

      {memberView && mine ? (
        <View style={[styles.mine, { borderColor: theme.cardBorder }]}>
          <Text style={[styles.mineLabel, { color: theme.textSoft }]}>My contribution · {mine.flatNumber}</Text>
          <View style={styles.mineRight}>
            <Text style={[styles.mineAmount, { color: theme.text }]}>
              {compactInr(mine.paid)}
              {mine.expected > 0 ? <Text style={{ color: theme.textMuted, fontWeight: '500' }}> / {compactInr(mine.expected)}</Text> : null}
            </Text>
            <Badge
              label={mine.pendingVerification > 0 ? 'Verifying' : contributionLabel(mine.status, !event.contributionRequired)}
              tone={mine.pendingVerification > 0 ? 'info' : contributionTone(mine.status)}
            />
          </View>
        </View>
      ) : null}

      {!memberView && open && (event.needsAttentionCount ?? 0) > 0 ? (
        <View style={styles.attention}>
          <Ionicons name="notifications-outline" size={14} color="#92400e" />
          <Text style={styles.attentionText}>{event.needsAttentionCount} to review</Text>
        </View>
      ) : null}
      {memberView && event.canManage ? (
        <View style={[styles.attention, { backgroundColor: theme.accentSoft }]}>
          <Ionicons name="shield-checkmark-outline" size={14} color={theme.accent} />
          <Text style={[styles.attentionText, { color: theme.accent }]}>You are on the committee</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Money({ label, value, color }: { label: string; value: string; color: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.moneyCell}>
      <Text style={[styles.moneyLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.moneyValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 14, marginBottom: 14 },
  shadow: Platform.select({
    ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 14 },
    android: { elevation: 2 },
    default: {},
  }) as object,
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  meta: { fontSize: 13, marginTop: 2 },
  money: { flexDirection: 'row', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12 },
  moneyCell: { flex: 1, gap: 3 },
  moneyLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  moneyValue: { fontSize: 19, fontWeight: '800' },
  progressWrap: { gap: 6 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: IN_COLOR },
  progressText: { fontSize: 12.5 },
  mine: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mineLabel: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  mineRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mineAmount: { fontSize: 15, fontWeight: '800' },
  attention: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  attentionText: { fontSize: 12.5, fontWeight: '700', color: '#92400e' },
});
