import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { createVisitorEntry, searchResidentsForVisitor } from '../../services/api';
import { apiErrorMessage } from '../../utils/apiError';
import type { ResidentSearchResult } from '../../types/api';
import { useTheme } from '../../theme/ThemeContext';
import { useAppAlert } from '../../context/AppAlertContext';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { useKeyboardAwareScroll } from '../../hooks/useKeyboardAwareScroll';
import {
  pickPhotoFromCamera,
  pickPhotoFromLibrary,
  showPhotoSourcePicker,
  type PickedPhoto,
} from '../../utils/pickPhoto';

const PURPOSE_OPTIONS = [
  'Guest Visit',
  'Delivery',
  'Cab / Driver',
  'Maintenance',
  'Official',
  'Other',
] as const;

function FormField({
  label,
  fieldRef,
  onFieldFocus,
  children,
}: {
  label: string;
  fieldRef?: RefObject<View | null>;
  onFieldFocus?: () => void;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View ref={fieldRef} style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text>
      {children}
      {onFieldFocus ? <View style={styles.focusHook} /> : null}
    </View>
  );
}

export function VisitorEntryModule() {
  const { theme } = useTheme();
  const { toast } = useAppAlert();
  const { scrollRef, keyboardScrollPadding, scrollToField, onScrollOffset } = useKeyboardAwareScroll();

  const [visitorName, setVisitorName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [visitorCount, setVisitorCount] = useState('1');
  const [purpose, setPurpose] = useState('');
  const [flatSearch, setFlatSearch] = useState('');
  const [residents, setResidents] = useState<ResidentSearchResult[]>([]);
  const [selected, setSelected] = useState<ResidentSearchResult | null>(null);
  const [expectedDuration, setExpectedDuration] = useState('60');
  const [remarks, setRemarks] = useState('');
  const [visitorPhoto, setVisitorPhoto] = useState<PickedPhoto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);

  const nameRef = useRef<View>(null);
  const mobileRef = useRef<View>(null);
  const vehicleRef = useRef<View>(null);
  const countRef = useRef<View>(null);
  const purposeRef = useRef<View>(null);
  const flatRef = useRef<View>(null);
  const durationRef = useRef<View>(null);
  const remarksRef = useRef<View>(null);
  const focusedRef = useRef<View | null>(null);

  const focusField = useCallback(
    (ref: RefObject<View | null>) => {
      focusedRef.current = ref.current;
      scrollToField(ref);
    },
    [scrollToField],
  );

  useEffect(() => {
    if (keyboardScrollPadding <= 0 || !focusedRef.current) return;
    scrollToField({ current: focusedRef.current });
  }, [keyboardScrollPadding, scrollToField]);

  const searchResidents = useCallback(async (q: string) => {
    setSearching(true);
    try {
      setResidents(await searchResidentsForVisitor(q));
    } catch {
      setResidents([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchResidents(flatSearch), 300);
    return () => clearTimeout(timer);
  }, [flatSearch, searchResidents]);

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.inputBg,
      color: theme.inputText,
      borderColor: theme.inputBorder,
    },
  ];

  function fieldProps(
    ref: RefObject<View | null>,
    extra?: Partial<TextInputProps>,
  ): Partial<TextInputProps> {
    return {
      ...extra,
      onFocus: () => focusField(ref),
      placeholderTextColor: theme.placeholder,
    };
  }

  async function handleSubmit() {
    Keyboard.dismiss();
    if (!visitorName.trim()) {
      toast('Enter visitor name', 'error');
      return;
    }
    if (!mobileNumber.trim() || mobileNumber.trim().length < 10) {
      toast('Enter a valid 10-digit mobile number', 'error');
      return;
    }
    if (!purpose.trim()) {
      toast('Enter purpose of visit', 'error');
      return;
    }
    if (!selected) {
      toast('Select a resident flat', 'error');
      focusField(flatRef);
      return;
    }
    setSubmitting(true);
    try {
      await createVisitorEntry(
        {
          visitorName: visitorName.trim(),
          mobileNumber: mobileNumber.trim(),
          vehicleNumber: vehicleNumber.trim() || undefined,
          visitorCount: Number(visitorCount) || 1,
          purpose: purpose.trim(),
          flatNumber: selected.flatNumber,
          residentMemberId: selected.memberId,
          expectedDurationMinutes: Number(expectedDuration) || undefined,
          remarks: remarks.trim() || undefined,
        },
        visitorPhoto
      );
      toast('Visitor registered — awaiting resident approval', 'success');
      setVisitorName('');
      setMobileNumber('');
      setVehicleNumber('');
      setVisitorCount('1');
      setPurpose('');
      setRemarks('');
      setVisitorPhoto(null);
      setSelected(null);
      setFlatSearch('');
      setResidents([]);
    } catch (e) {
      toast(apiErrorMessage(e, 'Registration failed'), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.pageBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 24 + keyboardScrollPadding },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => onScrollOffset(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        <Text style={[styles.screenTitle, { color: theme.text }]}>Visitor Entry</Text>
        <Text style={[styles.screenSubtitle, { color: theme.textMuted }]}>
          Register a guest at the gate. The flat resident will get a notification to approve entry.
        </Text>

        <SectionCard title="Visitor details" subtitle="Who is at the gate?">
          <View style={styles.photoBlock}>
            {visitorPhoto ? (
              <Image source={{ uri: visitorPhoto.uri }} style={styles.photoPreview} />
            ) : (
              <View style={[styles.photoPlaceholder, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}>
                <Text style={[styles.photoPlaceholderText, { color: theme.textMuted }]}>No photo yet</Text>
              </View>
            )}
            <View style={styles.photoActions}>
              <Pressable
                style={[styles.photoBtn, { backgroundColor: theme.accent }]}
                onPress={() =>
                  showPhotoSourcePicker(
                    () => {
                      void pickPhotoFromCamera().then((photo) => {
                        if (photo) setVisitorPhoto(photo);
                      });
                    },
                    () => {
                      void pickPhotoFromLibrary().then((photo) => {
                        if (photo) setVisitorPhoto(photo);
                      });
                    }
                  )
                }
              >
                <Text style={styles.photoBtnText}>{visitorPhoto ? 'Retake photo' : 'Take visitor photo'}</Text>
              </Pressable>
              {visitorPhoto ? (
                <Pressable onPress={() => setVisitorPhoto(null)}>
                  <Text style={[styles.removePhoto, { color: theme.textMuted }]}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <FormField label="Visitor name *" fieldRef={nameRef}>
            <TextInput
              value={visitorName}
              onChangeText={setVisitorName}
              style={inputStyle}
              placeholder="Full name"
              {...fieldProps(nameRef)}
            />
          </FormField>

          <FormField label="Mobile number *" fieldRef={mobileRef}>
            <TextInput
              value={mobileNumber}
              onChangeText={(t) => setMobileNumber(t.replace(/\D/g, '').slice(0, 10))}
              style={inputStyle}
              placeholder="10-digit mobile"
              keyboardType="phone-pad"
              maxLength={10}
              {...fieldProps(mobileRef, { keyboardType: 'phone-pad' })}
            />
          </FormField>

          <View style={styles.rowFields}>
            <View style={styles.rowField}>
              <FormField label="Visitors" fieldRef={countRef}>
                <TextInput
                  value={visitorCount}
                  onChangeText={(t) => setVisitorCount(t.replace(/\D/g, '').slice(0, 2))}
                  style={inputStyle}
                  keyboardType="number-pad"
                  {...fieldProps(countRef, { keyboardType: 'number-pad' })}
                />
              </FormField>
            </View>
            <View style={styles.rowField}>
              <FormField label="Vehicle (optional)" fieldRef={vehicleRef}>
                <TextInput
                  value={vehicleNumber}
                  onChangeText={setVehicleNumber}
                  style={inputStyle}
                  placeholder="MH 12 AB 1234"
                  autoCapitalize="characters"
                  {...fieldProps(vehicleRef, { autoCapitalize: 'characters' })}
                />
              </FormField>
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Host flat *" subtitle="Search by flat number or resident name">
          <FormField label="Search" fieldRef={flatRef}>
            <TextInput
              value={flatSearch}
              onChangeText={setFlatSearch}
              style={inputStyle}
              placeholder="e.g. A-101 or Rahul"
              {...fieldProps(flatRef)}
            />
          </FormField>

          {selected ? (
            <View style={[styles.selectedBanner, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
              <Text style={[styles.selectedTitle, { color: theme.accent }]}>Selected host</Text>
              <Text style={[styles.selectedText, { color: theme.text }]}>
                Flat {selected.flatNumber} · {selected.name}
              </Text>
              <Pressable onPress={() => setSelected(null)}>
                <Text style={[styles.changeLink, { color: theme.accent }]}>Change</Text>
              </Pressable>
            </View>
          ) : null}

          {searching ? <ActivityIndicator color={theme.accent} style={styles.searchLoader} /> : null}

          {!selected && residents.length > 0 ? (
            <View style={styles.residentList}>
              {residents.map((r) => (
                <Pressable
                  key={r.memberId}
                  onPress={() => {
                    setSelected(r);
                    setFlatSearch(r.flatNumber);
                    Keyboard.dismiss();
                  }}
                  style={({ pressed }) => [
                    styles.residentRow,
                    {
                      backgroundColor: pressed ? theme.accentSoft : theme.chipBg,
                      borderColor: theme.cardBorder,
                    },
                  ]}
                >
                  <View>
                    <Text style={[styles.residentFlat, { color: theme.text }]}>Flat {r.flatNumber}</Text>
                    <Text style={[styles.residentName, { color: theme.textMuted }]}>{r.name}</Text>
                  </View>
                  <Text style={[styles.selectHint, { color: theme.accent }]}>Select</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {!searching && !selected && flatSearch.trim() && residents.length === 0 ? (
            <Text style={[styles.emptyHint, { color: theme.textMuted }]}>
              No registered resident found for this search.
            </Text>
          ) : null}
        </SectionCard>

        <SectionCard title="Visit purpose *" subtitle="Resident sees this on the approval request">
          <View style={styles.chipRow}>
            {PURPOSE_OPTIONS.map((option) => {
              const active = purpose === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setPurpose(option)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? theme.chipActiveBg : theme.chipBg,
                      borderColor: active ? theme.chipActiveBorder : theme.chipBorder,
                    },
                  ]}
                >
                  <Text style={{ color: active ? theme.accent : theme.text, fontWeight: '600', fontSize: 13 }}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <FormField label="Or type custom purpose" fieldRef={purposeRef}>
            <TextInput
              value={purpose}
              onChangeText={setPurpose}
              style={inputStyle}
              placeholder="Purpose of visit"
              {...fieldProps(purposeRef)}
            />
          </FormField>

          <FormField label="Expected duration (minutes)" fieldRef={durationRef}>
            <TextInput
              value={expectedDuration}
              onChangeText={(t) => setExpectedDuration(t.replace(/\D/g, '').slice(0, 4))}
              style={inputStyle}
              keyboardType="number-pad"
              {...fieldProps(durationRef, { keyboardType: 'number-pad' })}
            />
          </FormField>

          <FormField label="Remarks (optional)" fieldRef={remarksRef}>
            <TextInput
              value={remarks}
              onChangeText={setRemarks}
              style={[inputStyle, styles.textArea]}
              placeholder="Any notes for security"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              {...fieldProps(remarksRef, { multiline: true, numberOfLines: 3, textAlignVertical: 'top' })}
            />
          </FormField>
        </SectionCard>

        <Pressable
          onPress={() => void handleSubmit()}
          disabled={submitting}
          style={({ pressed }) => [
            styles.submit,
            {
              backgroundColor: theme.accent,
              opacity: submitting ? 0.65 : pressed ? 0.9 : 1,
            },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Register visitor & notify resident</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 12 },
  screenTitle: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  screenSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  photoBlock: { marginBottom: 16, gap: 10 },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
  },
  photoPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: { fontSize: 13, fontWeight: '600' },
  photoActions: { gap: 8 },
  photoBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  removePhoto: { textAlign: 'center', fontSize: 13, fontWeight: '600' },
  fieldBlock: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  focusHook: { height: 0 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
  },
  textArea: { minHeight: 88, paddingTop: 12 },
  rowFields: { flexDirection: 'row', gap: 10 },
  rowField: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectedBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  selectedTitle: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  selectedText: { fontSize: 15, fontWeight: '600' },
  changeLink: { marginTop: 8, fontSize: 13, fontWeight: '600' },
  searchLoader: { marginVertical: 8 },
  residentList: { gap: 8 },
  residentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  residentFlat: { fontSize: 15, fontWeight: '700' },
  residentName: { fontSize: 13, marginTop: 2 },
  selectHint: { fontSize: 13, fontWeight: '700' },
  emptyHint: { fontSize: 13, marginTop: 4 },
  submit: {
    marginTop: 4,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
