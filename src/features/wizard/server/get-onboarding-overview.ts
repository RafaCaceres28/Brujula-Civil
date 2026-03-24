import { createClient } from '@/lib/supabase/server';
import { onboardingDraftSchema } from '../schemas/wizard.schema';
import { employabilityFlowDraftSchema } from '../schemas/wizard-state.schema';
import type { OnboardingOverview } from '../types/wizard.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEmployabilityFlow(input: unknown) {
  const parsedFlow = employabilityFlowDraftSchema.safeParse(input);

  if (!parsedFlow.success) {
    return undefined;
  }

  if (parsedFlow.data.selectedRoute || !parsedFlow.data.selectedRecommendation) {
    return parsedFlow.data;
  }

  return {
    ...parsedFlow.data,
    selectedRoute: parsedFlow.data.selectedRecommendation,
  };
}

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

  const aggregatedDraft = isRecord(state?.aggregated_draft_jsonb)
    ? state.aggregated_draft_jsonb
    : {};
  const draft = onboardingDraftSchema.parse(aggregatedDraft);
  const employabilityFlow = parseEmployabilityFlow(aggregatedDraft.employabilityFlow);
  const typedSteps = (steps ?? []) as OnboardingOverview['steps'];

  return {
    state: state as OnboardingOverview['state'],
    steps: typedSteps,
    completedStepKeys: typedSteps.filter((step) => step.is_completed).map((step) => step.step_key),
    draft,
    ...(employabilityFlow ? { employabilityFlow } : {}),
  };
}
