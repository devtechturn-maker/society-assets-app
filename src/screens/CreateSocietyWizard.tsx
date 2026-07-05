import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  FlatNumberFullList,
  FormatOptionCard,
  PhoneVerifiedChip,
  WizardShell,
  WizardTextField,
} from '../components/wizard';
import { useAppAlert } from '../context/AppAlertContext';
import { useWizardSteps } from '../hooks/useWizardSteps';
import { createAdditionalSocietyMobile, createSocietyMobile } from '../services/api';
import type { FlatNumberFormat, LoginData } from '../types/api';
import { apiErrorMessage } from '../utils/apiError';
import {
  customFormatValidationMessage,
  flatsValidationMessage,
  formatExampleLine,
  generateFlatNumbers,
  MAX_FLATS,
} from '../utils/flatNumbering';
import { colors } from '../theme/colors';

type Props = {
  phone?: string;
  selectionToken?: string;
  initialChairmanName?: string;
  additionalSociety?: boolean;
  onCreated: (data: LoginData) => void;
  onBack: () => void;
};

const STEPS = ['name', 'buildings', 'flats', 'format', 'profile'] as const;
type WizardStep = (typeof STEPS)[number];

const STEP_COPY: Record<WizardStep, { title: string; subtitle: string }> = {
  name: { title: 'Society name', subtitle: 'What should we call your society?' },
  buildings: {
    title: 'Buildings',
    subtitle: 'How many buildings or blocks are in the society?',
  },
  flats: { title: 'Total flats', subtitle: 'How many flats / units in total?' },
  format: {
    title: 'Flat numbers',
    subtitle: 'Pick a style. Customize sets flats per floor (e.g. 4 → 101–104, 201–204).',
  },
  profile: {
    title: 'Your details',
    subtitle: 'Free trial starts after setup. Buy a plan in the app when trial ends.',
  },
};

export function CreateSocietyWizard({
  phone = '',
  selectionToken = '',
  initialChairmanName = '',
  additionalSociety = false,
  onCreated,
  onBack,
}: Props) {
  const { alert } = useAppAlert();
  const wizard = useWizardSteps(STEPS);
  const step = wizard.step;

  const [societyName, setSocietyName] = useState('');
  const [buildings, setBuildings] = useState('');
  const [flats, setFlats] = useState('');
  const [format, setFormat] = useState<FlatNumberFormat>('FLOOR');
  const [flatsPerFloor, setFlatsPerFloor] = useState('4');
  const [chairmanName, setChairmanName] = useState(initialChairmanName);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const buildingsNum = Number.parseInt(buildings, 10) || 0;
  const flatsNum = Number.parseInt(flats, 10) || 0;
  const flatsPerFloorNum = Number.parseInt(flatsPerFloor, 10) || 0;

  const allFlatNumbers = useMemo(() => {
    if (buildingsNum < 1 || flatsNum < 1 || flatsNum % buildingsNum !== 0) {
      return [] as string[];
    }
    if (format === 'CUSTOM') {
      if (customFormatValidationMessage(buildingsNum, flatsNum, flatsPerFloorNum)) {
        return [] as string[];
      }
      return generateFlatNumbers(buildingsNum, flatsNum, 'CUSTOM', flatsPerFloorNum);
    }
    return generateFlatNumbers(buildingsNum, flatsNum, format);
  }, [buildingsNum, flatsNum, format, flatsPerFloorNum]);

  const floorExample = useMemo(
    () => formatExampleLine(generateFlatNumbers(buildingsNum || 1, flatsNum || buildingsNum || 1, 'FLOOR')),
    [buildingsNum, flatsNum]
  );
  const sequentialExample = useMemo(
    () =>
      formatExampleLine(generateFlatNumbers(buildingsNum || 1, flatsNum || buildingsNum || 1, 'SEQUENTIAL')),
    [buildingsNum, flatsNum]
  );
  const customExample = useMemo(() => {
    const perFloor = flatsPerFloorNum > 0 ? flatsPerFloorNum : 4;
    const sampleFlats = Math.max(buildingsNum || 1, 1) * perFloor * 2;
    const nums = generateFlatNumbers(buildingsNum || 1, sampleFlats, 'CUSTOM', perFloor);
    return nums.length > 0 ? formatExampleLine(nums) : '101–104, 201–204';
  }, [buildingsNum, flatsPerFloorNum]);

  function validateCurrent(): string | null {
    if (step === 'name' && !societyName.trim()) return 'Enter society name.';
    if (step === 'buildings') {
      if (buildingsNum < 1) return 'Enter number of buildings.';
      if (buildingsNum > 50) return 'Buildings cannot exceed 50.';
    }
    if (step === 'flats') {
      return flatsValidationMessage(buildingsNum, flatsNum);
    }
    if (step === 'format') {
      if (format === 'CUSTOM') {
        return customFormatValidationMessage(buildingsNum, flatsNum, flatsPerFloorNum);
      }
      return flatsValidationMessage(buildingsNum, flatsNum);
    }
    if (step === 'profile') {
      if (!chairmanName.trim()) return 'Enter your name.';
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return 'Enter a valid email address.';
      }
    }
    return null;
  }

  function handleBack() {
    setInlineError(null);
    if (wizard.isFirst) {
      onBack();
      return;
    }
    wizard.goBack();
  }

  async function handlePrimary() {
    const err = validateCurrent();
    if (err) {
      setInlineError(err);
      return;
    }
    setInlineError(null);
    if (!wizard.isLast) {
      wizard.goNext();
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        societyName: societyName.trim(),
        totalFlats: flatsNum,
        totalBuildings: buildingsNum,
        flatNumberFormat: format,
        flatsPerFloor: format === 'CUSTOM' ? flatsPerFloorNum : undefined,
        chairmanName: chairmanName.trim(),
        email: email.trim().toLowerCase(),
      };
      const data =
        additionalSociety || !selectionToken
          ? await createAdditionalSocietyMobile(payload)
          : await createSocietyMobile({
              phone,
              selectionToken,
              ...payload,
            });
      onCreated(data);
    } catch (e: unknown) {
      const message = apiErrorMessage(e);
      setInlineError(message);
      alert('Could not create society', message, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  const copy = STEP_COPY[step];
  const isFormatStep = step === 'format';

  return (
    <WizardShell
      title={societyName.trim() || 'Create society'}
      onBack={handleBack}
      progress={wizard.progress}
      stepLabel={`Step ${wizard.stepIndex + 1} of ${wizard.stepCount}`}
      heading={copy.title}
      subtitle={copy.subtitle}
      error={inlineError}
      primaryLabel={wizard.isLast ? 'Start free trial' : 'Next'}
      onPrimaryPress={() => void handlePrimary()}
      primaryLoading={submitting}
      bodyScroll={!isFormatStep}
    >
      {step === 'name' ? (
        <WizardTextField
          value={societyName}
          onChangeText={setSocietyName}
          placeholder="e.g. Green Valley Society"
          autoFocus
        />
      ) : null}

      {step === 'buildings' ? (
        <WizardTextField
          value={buildings}
          onChangeText={(v) => setBuildings(v.replace(/\D/g, '').slice(0, 2))}
          placeholder="e.g. 2"
          keyboardType="number-pad"
          autoFocus
        />
      ) : null}

      {step === 'flats' ? (
        <WizardTextField
          value={flats}
          onChangeText={(v) => setFlats(v.replace(/\D/g, '').slice(0, 4))}
          placeholder={`e.g. 24 (max ${MAX_FLATS})`}
          keyboardType="number-pad"
          autoFocus
          hint={`With ${buildingsNum || '—'} building(s), flats must divide evenly (e.g. 16 flats / 2 buildings).`}
        />
      ) : null}

      {isFormatStep ? (
        <View style={styles.formatStep}>
          <FormatOptionCard
            label="Floor based (auto)"
            description="App picks units per floor from your totals."
            example={floorExample}
            selected={format === 'FLOOR'}
            onPress={() => setFormat('FLOOR')}
          />
          <FormatOptionCard
            label="Sequential"
            description="Running numbers: 1, 2, 3… up to your total."
            example={sequentialExample}
            selected={format === 'SEQUENTIAL'}
            onPress={() => setFormat('SEQUENTIAL')}
          />
          <FormatOptionCard
            label="Customize"
            description="Set flats per floor. Example: 4 → 101–104, then 201–204."
            example={customExample}
            selected={format === 'CUSTOM'}
            onPress={() => setFormat('CUSTOM')}
          />

          {format === 'CUSTOM' ? (
            <View style={styles.customBox}>
              <WizardTextField
                label="Flats per floor"
                value={flatsPerFloor}
                onChangeText={(v) => {
                  setFlatsPerFloor(v.replace(/\D/g, '').slice(0, 2));
                  if (inlineError) setInlineError(null);
                }}
                placeholder="e.g. 4"
                keyboardType="number-pad"
              />
              <Text style={styles.customHint}>
                2 buildings, 4 flats/floor, 16 total → A-101…A-104, A-201…A-204, B-101…B-204.
              </Text>
            </View>
          ) : null}

          <FlatNumberFullList
            numbers={allFlatNumbers}
            emptyMessage={
              format === 'CUSTOM'
                ? 'Enter flats per floor so each building’s flats divide evenly (e.g. 8 flats ÷ 4 per floor).'
                : 'Enter buildings and total flats first.'
            }
          />
        </View>
      ) : null}

      {step === 'profile' ? (
        <>
          <WizardTextField
            label="Full name"
            value={chairmanName}
            onChangeText={setChairmanName}
            placeholder="Your name"
            autoFocus
          />
          <WizardTextField
            label="Email"
            spaced
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {phone ? <PhoneVerifiedChip phone={phone} label="Mobile" /> : null}
        </>
      ) : null}
    </WizardShell>
  );
}

const styles = StyleSheet.create({
  formatStep: {
    flex: 1,
  },
  customBox: {
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  customHint: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
  },
});
