import { createClient } from '@/lib/supabase/server';
import { onboardingDraftSchema } from '../schemas/wizard.schema';
import type { OnboardingOverview } from '../types/wizard.types';

export async function getOnboardingOverview(userId: string): Promise<OnboardingOverview> {
  const supabase = await createClient();

  const [{ data: state, error: stateError }, { data: steps, error: stepsError }] =
    await Promise.all([
      supabase.from('user_wizard_state').select('*').eq('user_id', userId).maybeSingle(),
      supabase
        .from('wizard_step_states')
        .select('*')
        .eq('user_id', userId)
        .order('step_order', { ascending: true }),
    ]);

  if (stateError) {
    throw new Error(`Error loading user_wizard_state: ${stateError.message}`);
  }

  if (stepsError) {
    throw new Error(`Error loading wizard_step_states: ${stepsError.message}`);
  }

  const draft = onboardingDraftSchema.parse(state?.aggregated_draft_jsonb ?? {});
  const typedSteps = (steps ?? []) as OnboardingOverview['steps'];

  return {
    state: state as OnboardingOverview['state'],
    steps: typedSteps,
    completedStepKeys: typedSteps.filter((step) => step.is_completed).map((step) => step.step_key),
    draft,
  };
}
