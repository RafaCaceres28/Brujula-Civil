import { createClient } from '@/lib/supabase/server';
import type { WizardStepSlug } from '../config/wizard-steps';
import { getDbKeyBySlug, getStepOrderBySlug } from '../config/wizard-steps';
import { onboardingDraftSchema } from '../schemas/wizard.schema';
import type { WizardPayloadBySlug } from '../types/wizard.types';
import { recalculateOnboardingState } from './recalculate-onboarding-state';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function saveOnboardingStep<TStep extends WizardStepSlug>(
  userId: string,
  stepSlug: TStep,
  payload: WizardPayloadBySlug[TStep],
  options?: {
    markCompleted?: boolean;
  },
) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const markCompleted = options?.markCompleted ?? false;

  const dbKey = getDbKeyBySlug(stepSlug);
  const stepOrder = getStepOrderBySlug(stepSlug);

  const { error: upsertStepError } = await supabase.from('wizard_step_states').upsert(
    {
      user_id: userId,
      step_key: dbKey,
      step_order: stepOrder,
      is_completed: markCompleted,
      payload_jsonb: payload,
      saved_at: now,
    },
    {
      onConflict: 'user_id,step_key',
    },
  );

  if (upsertStepError) {
    throw new Error(`Error saving onboarding step "${stepSlug}": ${upsertStepError.message}`);
  }

  const { data: currentWizardState, error: currentWizardStateError } = await supabase
    .from('user_wizard_state')
    .select('aggregated_draft_jsonb')
    .eq('user_id', userId)
    .maybeSingle();

  if (currentWizardStateError) {
    throw new Error(
      `Error loading user_wizard_state aggregated draft: ${currentWizardStateError.message}`,
    );
  }

  const currentAggregatedDraft = isRecord(currentWizardState?.aggregated_draft_jsonb)
    ? currentWizardState.aggregated_draft_jsonb
    : {};

  const previousDraft = onboardingDraftSchema.parse(currentAggregatedDraft);
  const mergedDraft = onboardingDraftSchema.parse({
    ...previousDraft,
    [stepSlug]: payload,
  });

  const currentEmployabilityFlow = isRecord(currentAggregatedDraft.employabilityFlow)
    ? currentAggregatedDraft.employabilityFlow
    : null;

  const mergedAggregatedDraft = {
    ...currentAggregatedDraft,
    ...mergedDraft,
    ...(currentEmployabilityFlow
      ? {
          employabilityFlow: {
            ...currentEmployabilityFlow,
            lastOnboardingStep: stepSlug,
            lastUpdatedAt: now,
          },
        }
      : {}),
  };

  const { error: updateWizardStateError } = await supabase
    .from('user_wizard_state')
    .update({
      aggregated_draft_jsonb: mergedAggregatedDraft,
      last_saved_at: now,
    })
    .eq('user_id', userId);

  if (updateWizardStateError) {
    throw new Error(
      `Error updating user_wizard_state aggregated draft: ${updateWizardStateError.message}`,
    );
  }

  return recalculateOnboardingState(userId);
}
