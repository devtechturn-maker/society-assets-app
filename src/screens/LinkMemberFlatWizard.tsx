import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  JoinCodeBoxInput,
  WizardShell,
  WIZARD_ACCENT,
  wizardStyles,
} from '../components/wizard';
import { useAppAlert } from '../context/AppAlertContext';
import {
  fetchClaimableFlats,
  linkMemberFlat,
  lookupOnboardingJoinCode,
  refreshLoginSession,
} from '../services/api';
import { saveSession } from '../services/storage';
import type { LoginData, OnboardingOpenFlat } from '../types/api';
import { apiErrorMessage } from '../utils/apiError';
import { JOIN_CODE_LENGTH, normalizeJoinCodeInput } from '../utils/societyJoinShare';
import { colors } from '../theme/colors';

type Props = {
  user: LoginData;
  onLinked: (user: LoginData) => void;
  onBack: () => void;
};

type Step = 'code' | 'flat';

export function LinkMemberFlatWizard({ user, onLinked, onBack }: Props) {
  const { alert } = useAppAlert();
  const [step, setStep] = useState<Step>('code');
  const [joinCode, setJoinCode] = useState('');
  const [societyName, setSocietyName] = useState('');
  const [flats, setFlats] = useState<OnboardingOpenFlat[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

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
      if (society.societyId !== user.societyId) {
        setInlineError('This join code is for another society. Use the code for your current society.');
        return;
      }
      setSocietyName(society.societyName);
      const claimable = await fetchClaimableFlats();
      setFlats(claimable);
      if (claimable.length === 0) {
        setInlineError('No open flats available to link. Ask the chairman to add your flat.');
        return;
      }
      setStep('flat');
    } catch (e: unknown) {
      setInlineError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function linkFlat(flat: OnboardingOpenFlat) {
    setSubmitting(true);
    setInlineError(null);
    try {
      await linkMemberFlat(flat.memberId);
      const refreshed = await refreshLoginSession();
      await saveSession(refreshed);
      onLinked(refreshed);
      alert('Flat linked', `You can now use Member view for Flat ${flat.flatNumber}.`, { variant: 'success' });
    } catch (e: unknown) {
      const message = apiErrorMessage(e);
      setInlineError(message);
      alert('Could not link flat', message, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    setInlineError(null);
    if (step === 'flat') {
      setStep('code');
      setFlats([]);
      return;
    }
    onBack();
  }

  return (
    <WizardShell
      title={societyName || 'Join as member'}
      onBack={handleBack}
      heading={step === 'code' ? 'Enter society join code' : 'Choose your flat'}
      subtitle={
        step === 'code'
          ? 'Use your society join code to link your flat as a member.'
          : `${societyName} · pick the flat you live in`
      }
      error={inlineError}
    >
      {step === 'code' ? (
        <>
          <JoinCodeBoxInput
            value={joinCode}
            onChange={setJoinCode}
            autoFocus
            onComplete={() => void lookupByCode()}
          />
          <Pressable style={styles.primaryBtn} onPress={() => void lookupByCode()} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={wizardStyles.primaryBtnText}>Continue</Text>
            )}
          </Pressable>
        </>
      ) : null}

      {step === 'flat' ? (
        submitting ? (
          <ActivityIndicator color={WIZARD_ACCENT} />
        ) : (
          <View style={styles.flatGrid}>
            {flats.map((flat) => (
              <Pressable key={flat.memberId} style={styles.flatChip} onPress={() => void linkFlat(flat)}>
                <Text style={styles.flatChipText}>{flat.flatNumber}</Text>
              </Pressable>
            ))}
          </View>
        )
      ) : null}
    </WizardShell>
  );
}

const styles = StyleSheet.create({
  primaryBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: WIZARD_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
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
  flatChipText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy900,
  },
});
