import { createClient } from '@/lib/supabase/server';
import type { WizardStepKeyDb } from '@/types/database.types';
import { FIRST_WIZARD_DB_STEP, WIZARD_STEPS } from '../config/wizard-steps';

type StepStateRow = {
  step_key: WizardStepKeyDb;
  is_completed: boolean;
};

export async function recalculateOnboardingState(userId: string) {
  const supabase = await createClient();

  const { data: stepStates, error: stepStatesError } = await supabase
    .from('wizard_step_states')
    .select('step_key, is_completed')
    .eq('user_id', userId);

  if (stepStatesError) {
    throw new Error(`Error loading wizard_step_states: ${stepStatesError.message}`);
  }

  const typedStates = (stepStates ?? []) as StepStateRow[];

  const completedSteps = WIZARD_STEPS.filter((step) =>
    typedStates.some((row) => row.step_key === step.dbKey && row.is_completed),
  );

  const isCompleted = completedSteps.length === WIZARD_STEPS.length;

  let currentStep: WizardStepKeyDb = FIRST_WIZARD_DB_STEP;
  let lastCompletedStep: WizardStepKeyDb | null = null;
  let completionPercent = 0;

  if (isCompleted) {
    currentStep = 'completed';
    lastCompletedStep = WIZARD_STEPS[WIZARD_STEPS.length - 1].dbKey;
    completionPercent = 100;
  } else {
    const firstIncomplete =
      WIZARD_STEPS.find(
        (step) => !typedStates.some((row) => row.step_key === step.dbKey && row.is_completed),
      ) ?? WIZARD_STEPS[0];

    currentStep = firstIncomplete.dbKey;
    lastCompletedStep =
      completedSteps.length > 0 ? completedSteps[completedSteps.length - 1].dbKey : null;
    completionPercent = Number(((completedSteps.length / WIZARD_STEPS.length) * 100).toFixed(2));
  }

  const now = new Date().toISOString();

  const { error: updateWizardStateError } = await supabase
    .from('user_wizard_state')
    .update({
      current_step: currentStep,
      last_completed_step: lastCompletedStep,
      completion_percent: completionPercent,
      is_completed: isCompleted,
      completed_at: isCompleted ? now : null,
      last_saved_at: now,
    })
    .eq('user_id', userId);

  if (updateWizardStateError) {
    throw new Error(`Error updating user_wizard_state: ${updateWizardStateError.message}`);
  }

  const { error: updateProfileError } = await supabase
    .from('app_user_profiles')
    .update({
      onboarding_completed: isCompleted,
    })
    .eq('user_id', userId);

  if (updateProfileError) {
    throw new Error(
      `Error updating app_user_profiles.onboarding_completed: ${updateProfileError.message}`,
    );
  }

  return {
    currentStep,
    lastCompletedStep,
    completionPercent,
    isCompleted,
  };
}
