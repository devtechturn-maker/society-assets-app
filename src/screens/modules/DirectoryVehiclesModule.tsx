import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ListEmpty, ListError } from '../../components/dashboard/ListStates';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { DirectoryAddButton, DirectoryListItem } from '../../components/directory/DirectoryListItem';
import { useAppAlert } from '../../context/AppAlertContext';
import {
  createMemberVehicle,
  deleteMemberVehicle,
  fetchMemberVehicles,
  updateMemberVehicle,
} from '../../services/api';
import type { MemberVehicleRecord, MemberVehicleType, VehiclePayload } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { DirectorySectionShell } from './DirectoryHubModule';

const VEHICLE_TYPES: { value: MemberVehicleType; label: string }[] = [
  { value: 'FOUR_WHEELER', label: '4-wheeler' },
  { value: 'TWO_WHEELER', label: '2-wheeler' },
  { value: 'OTHER', label: 'Other' },
];

function normalizeVehicleType(value?: MemberVehicleType | string | null): MemberVehicleType {
  const normalized = (value ?? 'FOUR_WHEELER').toUpperCase().replace(/-/g, '_');
  if (normalized === 'CAR' || normalized === 'FOUR_WHEELER' || normalized === '4_WHEELER') {
    return 'FOUR_WHEELER';
  }
  if (normalized === 'BIKE' || normalized === 'TWO_WHEELER' || normalized === '2_WHEELER') {
    return 'TWO_WHEELER';
  }
  return 'OTHER';
}

function vehicleTypeLabel(value: MemberVehicleType | string): string {
  const type = normalizeVehicleType(value);
  return VEHICLE_TYPES.find((item) => item.value === type)?.label ?? 'Other';
}

function VehicleFormModal({
  visible,
  initial,
  onClose,
  onSaved,
}: {
  visible: boolean;
  initial?: MemberVehicleRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const [vehicleType, setVehicleType] = useState<MemberVehicleType>('FOUR_WHEELER');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [color, setColor] = useState('');
  const [parkingSlot, setParkingSlot] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setVehicleType(normalizeVehicleType(initial?.vehicleType));
    setRegistrationNumber(initial?.registrationNumber ?? '');
    setMakeModel(initial?.makeModel ?? '');
    setColor(initial?.color ?? '');
    setParkingSlot(initial?.parkingSlot ?? '');
  }, [visible, initial]);

  async function handleSave() {
    const reg = registrationNumber.trim();
    if (reg.length < 4) {
      toast('Enter a valid registration number', 'error');
      return;
    }
    const payload: VehiclePayload = {
      vehicleType,
      registrationNumber: reg.toUpperCase(),
      makeModel: makeModel.trim() || undefined,
      color: color.trim() || undefined,
      parkingSlot: parkingSlot.trim() || undefined,
    };
    setSaving(true);
    try {
      if (initial) {
        await updateMemberVehicle(initial.id, payload);
        toast('Vehicle updated', 'success');
      } else {
        await createMemberVehicle(payload);
        toast('Vehicle added', 'success');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            {initial ? 'Edit vehicle' : 'Add vehicle'}
          </Text>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalForm}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Vehicle type</Text>
            <View style={styles.chipRow}>
              {VEHICLE_TYPES.map((item) => {
                const active = vehicleType === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setVehicleType(item.value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.chipActiveBg : theme.chipBg,
                        borderColor: active ? theme.chipActiveBorder : theme.chipBorder,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? theme.accent : theme.text, fontWeight: '600', fontSize: 12 }}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Registration number</Text>
            <TextInput
              value={registrationNumber}
              onChangeText={setRegistrationNumber}
              autoCapitalize="characters"
              placeholder="e.g. GJ01AB1234"
              placeholderTextColor={theme.placeholder}
              style={[styles.input, { color: theme.inputText, borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
            />
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Make & model (optional)</Text>
            <TextInput
              value={makeModel}
              onChangeText={setMakeModel}
              placeholder="e.g. Honda City"
              placeholderTextColor={theme.placeholder}
              style={[styles.input, { color: theme.inputText, borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
            />
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Color (optional)</Text>
            <TextInput
              value={color}
              onChangeText={setColor}
              placeholder="e.g. White"
              placeholderTextColor={theme.placeholder}
              style={[styles.input, { color: theme.inputText, borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
            />
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Parking slot (optional)</Text>
            <TextInput
              value={parkingSlot}
              onChangeText={setParkingSlot}
              placeholder="e.g. B1-42"
              placeholderTextColor={theme.placeholder}
              style={[styles.input, { color: theme.inputText, borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
            />
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={[styles.secondaryBtn, { borderColor: theme.cardBorder }]}>
              <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleSave()}
              disabled={saving}
              style={[styles.primaryBtn, { backgroundColor: theme.accent, opacity: saving ? 0.7 : 1 }]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{initial ? 'Save' : 'Add'}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function DirectoryVehiclesModule({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { toast, confirm } = useAppAlert();
  const [items, setItems] = useState<MemberVehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MemberVehicleRecord | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setItems(await fetchMemberVehicles());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vehicles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(item: MemberVehicleRecord) {
    setEditing(item);
    setModalOpen(true);
  }

  function removeItem(item: MemberVehicleRecord) {
    confirm({
      title: 'Remove vehicle?',
      message: `Remove ${item.registrationNumber} from your list?`,
      confirmText: 'Remove',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteMemberVehicle(item.id);
          toast('Vehicle removed', 'success');
          await load(true);
        } catch (e) {
          toast(e instanceof Error ? e.message : 'Remove failed', 'error');
        }
      },
    });
  }

  return (
    <DirectorySectionShell title="Vehicles" onBack={onBack}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
      >
        <SectionCard
          title="Registered vehicles"
          subtitle="Keep your flat's vehicle details updated for society parking and security"
          headerRight={<DirectoryAddButton onPress={openAdd} label="Add vehicle" />}
        >
          {loading ? <ActivityIndicator color={theme.accent} /> : null}
          {error ? <ListError message={error} onRetry={() => void load()} /> : null}
          {!loading && !error && items.length === 0 ? (
            <ListEmpty
              icon="car"
              title="No vehicles added yet"
              subtitle="Tap + to register a vehicle for your flat."
            />
          ) : null}
          {items.map((item) => (
            <DirectoryListItem
              key={item.id}
              title={item.registrationNumber}
              meta={[vehicleTypeLabel(item.vehicleType), item.makeModel].filter(Boolean).join(' · ')}
              secondaryMeta={
                item.color || item.parkingSlot
                  ? [item.color, item.parkingSlot ? `Slot ${item.parkingSlot}` : ''].filter(Boolean).join(' · ')
                  : null
              }
              avatarIcon="car"
              onPress={() => openEdit(item)}
              onDelete={() => removeItem(item)}
            />
          ))}
        </SectionCard>
      </ScrollView>

      <VehicleFormModal
        visible={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load(true)}
      />
    </DirectorySectionShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 28 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    maxHeight: '88%',
    flexShrink: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 14 },
  modalScroll: { flexShrink: 1 },
  modalForm: { paddingBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
