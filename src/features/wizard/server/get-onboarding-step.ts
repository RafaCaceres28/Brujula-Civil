import { createClient } from '@/lib/supabase/server';
import type { WizardStepSlug } from '../config/wizard-steps';
import { getDbKeyBySlug } from '../config/wizard-steps';

export async function getOnboardingStep(userId: string, stepSlug: WizardStepSlug) {
  const supabase = await createClient();
  const dbKey = getDbKeyBySlug(stepSlug);

  const { data, error } = await supabase
    .from('wizard_step_states')
    .select('*')
    .eq('user_id', userId)
    .eq('step_key', dbKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Error loading onboarding step "${stepSlug}": ${error.message}`);
  }

  return data;
}
