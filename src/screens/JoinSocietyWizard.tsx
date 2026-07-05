import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  JoinCodeBoxInput,
  SelectableOptionCard,
  WizardShell,
  WizardTextField,
  WIZARD_ACCENT,
  wizardStyles,
} from '../components/wizard';
import { useAppAlert } from '../context/AppAlertContext';
import {
  joinSocietyMobile,
  listOnboardingOpenFlats,
  lookupOnboardingJoinCode,
  searchOnboardingSocieties,
} from '../services/api';
import type { LoginData, OnboardingOpenFlat, OnboardingSocietyOption } from '../types/api';
import { apiErrorMessage } from '../utils/apiError';
import { JOIN_CODE_LENGTH, normalizeJoinCodeInput } from '../utils/societyJoinShare';
import { colors } from '../theme/colors';

type Props = {
  phone: string;
  selectionToken: string;
  onJoined: (data: LoginData) => void;
  onBack: () => void;
};

type Step = 'code' | 'search' | 'flat' | 'name';

const STEP_COPY: Record<Step, { title: string; subtitle: string }> = {
  code: {
    title: 'Enter society join code',
    subtitle: 'Ask your chairman for the 8-character code, or search by society name.',
  },
  search: {
    title: 'Find your society',
    subtitle: 'Search by society name, then pick your open flat.',
  },
  flat: {
    title: 'Choose your flat',
    subtitle: 'Only open flats are listed.',
  },
  name: {
    title: 'Your name',
    subtitle: '',
  },
};

export function JoinSocietyWizard({ phone, selectionToken, onJoined, onBack }: Props) {
  const { alert } = useAppAlert();
  const [step, setStep] = useState<Step>('code');
  const [joinCode, setJoinCode] = useState('');
  const [query, setQuery] = useState('');
  const [societies, setSocieties] = useState<OnboardingSocietyOption[]>([]);
  const [selectedSociety, setSelectedSociety] = useState<OnboardingSocietyOption | null>(null);
  const [flats, setFlats] = useState<OnboardingOpenFlat[]>([]);
  const [selectedFlat, setSelectedFlat] = useState<OnboardingOpenFlat | null>(null);
  const [memberName, setMemberName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [viaJoinCode, setViaJoinCode] = useState(false);

  async function pickSociety(society: OnboardingSocietyOption) {
    setSelectedSociety(society);
    setSelectedFlat(null);
    setLoading(true);
    setInlineError(null);
    try {
      const open = await listOnboardingOpenFlats(society.societyId);
      setFlats(open);
      if (open.length === 0) {
        setInlineError('No open flats in this society. Ask the chairman to add your flat.');
        return;
      }
      setStep('flat');
    } catch (e: unknown) {
      setInlineError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function pickSocietyFromSearch(society: OnboardingSocietyOption) {
    setViaJoinCode(false);
    await pickSociety(society);
  }

  async function lookupByCode() {
    const normalized = normalizeJoinCodeInput(joinCode);
    if (normalized.length !== JOIN_CODE_LENGTH) {
      setInlineError(`Enter the full ${JOIN_CODE_LENGTH}-character join code.`);
      return;
    }
    setLoading(true);
    setInlineError(null);
    try {
      const society = await lookupOnboardingJoinCode(normalized);
      setViaJoinCode(true);
      await pickSociety(society);
    } catch (e: unknown) {
      setInlineError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function runSearch() {
    if (query.trim().length < 2) {
      setInlineError('Enter at least 2 characters.');
      return;
    }
    setLoading(true);
    setInlineError(null);
    try {
      const list = await searchOnboardingSocieties(query);
      setSocieties(list);
      if (list.length === 0) {
        setInlineError('No societies found. Check the name or ask your chairman for the join code.');
      }
    } catch (e: unknown) {
      setInlineError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function pickFlat(flat: OnboardingOpenFlat) {
    setSelectedFlat(flat);
    setStep('name');
    setInlineError(null);
  }

  function handleBack() {
    setInlineError(null);
    if (step === 'name') {
      setStep('flat');
      return;
    }
    if (step === 'flat') {
      setStep(viaJoinCode ? 'code' : 'search');
      setSelectedSociety(null);
      setFlats([]);
      return;
    }
    if (step === 'search') {
      setStep('code');
      setSocieties([]);
      return;
    }
    onBack();
  }

  async function submit() {
    if (!selectedSociety || !selectedFlat) return;
    if (!memberName.trim()) {
      setInlineError('Enter your name.');
      return;
    }
    setSubmitting(true);
    setInlineError(null);
    try {
      const data = await joinSocietyMobile({
        phone,
        selectionToken,
        societyId: selectedSociety.societyId,
        memberId: selectedFlat.memberId,
        memberName: memberName.trim(),
      });
      onJoined(data);
    } catch (e: unknown) {
      const message = apiErrorMessage(e);
      setInlineError(message);
      alert('Could not join society', message, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  const copy = STEP_COPY[step];
  const subtitle =
    step === 'name'
      ? `Flat ${selectedFlat?.flatNumber ?? ''} · +91 ${phone}`
      : copy.subtitle;

  return (
    <WizardShell
      title={selectedSociety?.societyName || 'Join society'}
      onBack={handleBack}
      heading={copy.title}
      subtitle={subtitle}
      error={inlineError}
      showPrimary={step === 'name'}
      primaryLabel="Join society"
      onPrimaryPress={() => void submit()}
      primaryLoading={submitting}
    >
      {step === 'code' ? (
        <>
          <JoinCodeBoxInput
            value={joinCode}
            onChange={setJoinCode}
            autoFocus
            onComplete={() => void lookupByCode()}
          />
          <Pressable style={styles.searchBtn} onPress={() => void lookupByCode()} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={wizardStyles.primaryBtnText}>Continue</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.linkBtn}
            onPress={() => {
              setInlineError(null);
              setStep('search');
            }}
          >
            <Text style={styles.linkText}>Search by society name instead</Text>
          </Pressable>
        </>
      ) : null}

      {step === 'search' ? (
        <>
          <View style={styles.searchRow}>
            <View style={styles.searchInput}>
              <WizardTextField
                value={query}
                onChangeText={setQuery}
                placeholder="Society name"
                autoFocus
                onSubmitEditing={() => void runSearch()}
                returnKeyType="search"
              />
            </View>
            <Pressable style={styles.searchBtn} onPress={() => void runSearch()} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={wizardStyles.primaryBtnText}>Search</Text>
              )}
            </Pressable>
          </View>
          {societies.map((society) => (
            <SelectableOptionCard
              key={society.societyId}
              title={society.societyName}
              meta={`${society.openFlats} open flat${society.openFlats === 1 ? '' : 's'}${
                society.totalFlats != null ? ` · ${society.totalFlats} total` : ''
              }`}
              showChevron
              onPress={() => void pickSocietyFromSearch(society)}
            />
          ))}
          <Pressable
            style={styles.linkBtn}
            onPress={() => {
              setInlineError(null);
              setStep('code');
            }}
          >
            <Text style={styles.linkText}>Use join code instead</Text>
          </Pressable>
        </>
      ) : null}

      {step === 'flat' ? (
        loading ? (
          <ActivityIndicator color={WIZARD_ACCENT} />
        ) : (
          <View style={styles.flatGrid}>
            {flats.map((flat) => (
              <Pressable
                key={flat.memberId}
                style={[
                  styles.flatChip,
                  selectedFlat?.memberId === flat.memberId && styles.flatChipSelected,
                ]}
                onPress={() => pickFlat(flat)}
              >
                <Text
                  style={[
                    styles.flatChipText,
                    selectedFlat?.memberId === flat.memberId && styles.flatChipTextSelected,
                  ]}
                >
                  {flat.flatNumber}
                </Text>
              </Pressable>
            ))}
          </View>
        )
      ) : null}

      {step === 'name' ? (
        <WizardTextField
          value={memberName}
          onChangeText={setMemberName}
          placeholder="Full name"
          autoFocus
        />
      ) : null}
    </WizardShell>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  searchInput: { flex: 1 },
  searchBtn: {
    minWidth: 88,
    height: 50,
    borderRadius: 12,
    backgroundColor: WIZARD_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    color: WIZARD_ACCENT,
    fontSize: 14,
    fontWeight: '700',
  },
  flatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flatChip: {
    minWidth: 72,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  flatChipSelected: {
    borderColor: WIZARD_ACCENT,
    backgroundColor: WIZARD_ACCENT,
  },
  flatChipText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy900,
  },
  flatChipTextSelected: { color: '#fff' },
});
