import { FIRST_WIZARD_DB_STEP, getStepRouteByDbKey } from '../config/wizard-steps';
import { getOnboardingState } from './get-onboarding-state';

export async function resolveOnboardingEntry(userId: string) {
  const state = await getOnboardingState(userId);

  if (!state) {
    return getStepRouteByDbKey(FIRST_WIZARD_DB_STEP);
  }

  if (state.is_completed || state.current_step === 'completed') {
    return '/dashboard';
  }

  const currentStep = state.current_step ?? FIRST_WIZARD_DB_STEP;

  return getStepRouteByDbKey(currentStep);
}
