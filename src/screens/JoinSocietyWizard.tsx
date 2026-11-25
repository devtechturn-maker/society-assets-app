import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  JoinCodeBoxInput,
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
} from '../services/api';
import type { LoginData, OnboardingOpenFlat, OnboardingSocietyOption } from '../types/api';
import { apiErrorMessage } from '../utils/apiError';
import { JOIN_CODE_LENGTH, normalizeJoinCodeInput } from '../utils/societyJoinShare';
import { colors } from '../theme/colors';
import { unitName } from '../utils/unitName';

type Props = {
  /** Login email already verified by the code. */
  email: string;
  selectionToken: string;
  onJoined: (data: LoginData) => void;
  onBack: () => void;
};

type Step = 'code' | 'flat' | 'name';

const STEP_COPY: Record<Step, { title: string; subtitle: string }> = {
  code: {
    title: 'Enter society join code',
    subtitle: 'Ask your chairman for the 8-character code.',
  },
  flat: {
    title: 'Choose your flat',
    subtitle: 'Only open flats are listed.',
  },
  name: {
    title: 'Your details',
    subtitle: '',
  },
};

const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

export function JoinSocietyWizard({ email, selectionToken, onJoined, onBack }: Props) {
  const { alert } = useAppAlert();
  const [step, setStep] = useState<Step>('code');
  const [joinCode, setJoinCode] = useState('');
  const [selectedSociety, setSelectedSociety] = useState<OnboardingSocietyOption | null>(null);
  const [flats, setFlats] = useState<OnboardingOpenFlat[]>([]);
  const [selectedFlat, setSelectedFlat] = useState<OnboardingOpenFlat | null>(null);
  const [memberName, setMemberName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  async function pickSociety(society: OnboardingSocietyOption, code: string) {
    setSelectedSociety(society);
    setSelectedFlat(null);
    setLoading(true);
    setInlineError(null);
    try {
      const open = await listOnboardingOpenFlats(code);
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
      await pickSociety(society, normalized);
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
      setStep('code');
      setSelectedSociety(null);
      setFlats([]);
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
    if (!INDIAN_MOBILE_PATTERN.test(phone)) {
      setInlineError('Enter a valid 10-digit mobile number.');
      return;
    }
    setSubmitting(true);
    setInlineError(null);
    try {
      const data = await joinSocietyMobile({
        email,
        phone,
        selectionToken,
        societyId: selectedSociety.societyId,
        flatId: selectedFlat.flatId,
        memberName: memberName.trim(),
        joinCode: normalizeJoinCodeInput(joinCode),
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
      ? `${unitName(selectedFlat?.flatNumber ?? '')} · ${email}`
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
          <Text style={styles.linkText}>Ask your chairman for the 8-character join code.</Text>
        </>
      ) : null}

      {step === 'flat' ? (
        loading ? (
          <ActivityIndicator color={WIZARD_ACCENT} />
        ) : (
          <View style={styles.flatGrid}>
            {flats.map((flat) => (
              <Pressable
                key={flat.flatId}
                style={[
                  styles.flatChip,
                  selectedFlat?.flatId === flat.flatId && styles.flatChipSelected,
                ]}
                onPress={() => pickFlat(flat)}
              >
                <Text
                  style={[
                    styles.flatChipText,
                    selectedFlat?.flatId === flat.flatId && styles.flatChipTextSelected,
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
        <>
          <WizardTextField
            label="Full name"
            value={memberName}
            onChangeText={setMemberName}
            placeholder="Full name"
            autoFocus
          />
          <WizardTextField
            label="Mobile number"
            spaced
            value={phone}
            onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(-10))}
            placeholder="10-digit mobile number"
            keyboardType="number-pad"
            maxLength={10}
            hint="Shared with your society office. You sign in with your email."
          />
        </>
      ) : null}
    </WizardShell>
  );
}

const styles = StyleSheet.create({
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
