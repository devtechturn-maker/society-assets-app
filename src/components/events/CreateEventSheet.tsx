import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createSocietyEvent } from '../../services/api';
import type { SocietyEventDetail, SocietyEventListItem, SocietyEventType } from '../../types/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useTheme } from '../../theme/ThemeContext';
import { apiErrorMessage } from '../../utils/apiError';
import { EVENT_TYPE_OPTIONS } from '../../utils/eventFormat';
import { ChipRow, EventSheet, SheetButtons, SheetField, SheetInput } from './EventSheet';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Quick event creation for the chairman / treasurer. Flat-wise amounts can be adjusted afterwards. */
export function CreateEventSheet({
  visible,
  previousEvents,
  onClose,
  onCreated,
}: {
  visible: boolean;
  previousEvents: SocietyEventListItem[];
  onClose: () => void;
  onCreated: (detail: SocietyEventDetail) => void;
}) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState<SocietyEventType>('FESTIVAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [required, setRequired] = useState(true);
  const [amount, setAmount] = useState('');
  const [copyFrom, setCopyFrom] = useState<string | null>(null);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName('');
    setEventType('FESTIVAL');
    setStartDate('');
    setEndDate('');
    setRequired(true);
    setAmount('');
    setCopyFrom(null);
    setNotify(true);
    setSaving(false);
  }, [visible]);

  async function save() {
    if (!name.trim()) {
      toast('Give the event a name, e.g. Navratri 2026.', 'warning');
      return;
    }
    if ((startDate && !DATE_RE.test(startDate)) || (endDate && !DATE_RE.test(endDate))) {
      toast('Dates must be YYYY-MM-DD.', 'warning');
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      toast('End date cannot be before the start date.', 'warning');
      return;
    }
    const perFlat = amount ? Number(amount) : null;
    if (perFlat !== null && (!Number.isFinite(perFlat) || perFlat < 0)) {
      toast('Enter a valid amount per flat.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const detail = await createSocietyEvent({
        name: name.trim(),
        eventType,
        startDate: startDate || null,
        endDate: endDate || null,
        contributionRequired: required,
        defaultContributionAmount: copyFrom ? null : perFlat,
        applyDefaultTo: 'OCCUPIED_FLATS',
        copyFromEventId: copyFrom,
        notifyMembers: notify,
      });
      toast('Event created', 'success');
      onCreated(detail);
      onClose();
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not create the event'), 'error');
    } finally {
      setSaving(false);
    }
  }

  const recent = previousEvents.filter((e) => e.status !== 'CANCELLED').slice(0, 4);

  return (
    <EventSheet
      visible={visible}
      title="New event"
      subtitle="Festival, function, sports day — anything with its own money"
      onClose={onClose}
      footer={<SheetButtons onCancel={onClose} onSave={() => void save()} saving={saving} saveLabel="Create" />}
    >
      <SheetField label="Event name">
        <SheetInput value={name} onChangeText={setName} placeholder="e.g. Navratri 2026" maxLength={120} />
      </SheetField>

      <SheetField label="Type">
        <View style={styles.types}>
          {EVENT_TYPE_OPTIONS.map((option) => {
            const active = option.value === eventType;
            return (
              <Pressable
                key={option.value}
                onPress={() => setEventType(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[
                  styles.type,
                  { borderColor: active ? theme.accent : theme.chipBorder, backgroundColor: active ? theme.accentSoft : theme.chipBg },
                ]}
              >
                <Ionicons name={option.icon} size={18} color={active ? theme.accent : theme.textMuted} />
                <Text style={[styles.typeText, { color: active ? theme.accent : theme.text }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SheetField>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <SheetField label="Starts" hint="optional">
            <SheetInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" maxLength={10} />
          </SheetField>
        </View>
        <View style={{ flex: 1 }}>
          <SheetField label="Ends" hint="optional">
            <SheetInput value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" maxLength={10} />
          </SheetField>
        </View>
      </View>

      <View style={[styles.switchRow, { borderColor: theme.cardBorder }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.switchTitle, { color: theme.text }]}>
            {required ? 'Every flat contributes' : 'Voluntary contribution'}
          </Text>
          <Text style={[styles.switchSub, { color: theme.textMuted }]}>
            {required ? 'Track pending flats and send reminders' : 'No pending list, no reminders'}
          </Text>
        </View>
        <Switch value={required} onValueChange={setRequired} trackColor={{ true: theme.accent, false: theme.chipBorder }} />
      </View>

      {recent.length > 0 ? (
        <SheetField label="Start from" hint="optional">
          <ChipRow
            options={[{ label: 'Fresh', value: '__fresh__' }, ...recent.map((e) => ({ label: `Copy ${e.name}`, value: e.eventId }))]}
            value={copyFrom ?? '__fresh__'}
            onChange={(value) => setCopyFrom(value === '__fresh__' ? null : value)}
          />
        </SheetField>
      ) : null}

      {!copyFrom ? (
        <SheetField label={required ? 'Amount per flat' : 'Suggested amount'} hint="optional · editable per flat later">
          <SheetInput large value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="₹ 300" />
        </SheetField>
      ) : (
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>Flat amounts and budget will be copied. You can change them later.</Text>
      )}

      <View style={[styles.switchRow, { borderColor: theme.cardBorder }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.switchTitle, { color: theme.text }]}>Announce to members</Text>
          <Text style={[styles.switchSub, { color: theme.textMuted }]}>Sends an app notification</Text>
        </View>
        <Switch value={notify} onValueChange={setNotify} trackColor={{ true: theme.accent, false: theme.chipBorder }} />
      </View>
    </EventSheet>
  );
}

const styles = StyleSheet.create({
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  type: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  typeText: { fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  switchTitle: { fontSize: 15, fontWeight: '700' },
  switchSub: { fontSize: 12.5, marginTop: 2 },
});
