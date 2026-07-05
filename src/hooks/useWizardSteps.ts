import { useCallback, useMemo, useState } from 'react';

/** Generic step index navigation for multi-step flows. */
export function useWizardSteps<T extends string>(steps: readonly T[]) {
  const [stepIndex, setStepIndex] = useState(0);

  const step = steps[stepIndex] ?? steps[0];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= steps.length - 1;
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const goNext = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const reset = useCallback(() => setStepIndex(0), []);

  return useMemo(
    () => ({
      step,
      stepIndex,
      isFirst,
      isLast,
      progress,
      stepCount: steps.length,
      goNext,
      goBack,
      reset,
      setStepIndex,
    }),
    [step, stepIndex, isFirst, isLast, progress, steps.length, goNext, goBack, reset]
  );
}
