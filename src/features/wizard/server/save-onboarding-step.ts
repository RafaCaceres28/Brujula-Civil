import { createClient } from '@/lib/supabase/server';
import { ZodError } from 'zod';
import type { WizardStepSlug } from '../config/wizard-steps';
import { getDbKeyBySlug, getStepOrderBySlug } from '../config/wizard-steps';
import {
  competenciasStepSchema,
  experienciaStepSchema,
  militarStepSchema,
  objetivosStepSchema,
  onboardingDraftSchema,
  resumenStepSchema,
} from '../schemas/wizard.schema';
import {
  employabilityFlowDraftSchema,
  onboardingDraftStateSchema,
} from '../schemas/wizard-state.schema';
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

  const stepSchema = {
    militar: militarStepSchema,
    experiencia: experienciaStepSchema,
    competencias: competenciasStepSchema,
    objetivos: objetivosStepSchema,
    resumen: resumenStepSchema,
  }[stepSlug];

  let parsedPayload: WizardPayloadBySlug[TStep];

  try {
    parsedPayload = stepSchema.parse(payload) as WizardPayloadBySlug[TStep];
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      const hasCatalogValidationIssues = error.issues.some((issue) =>
        issue.message.includes('catálogo'),
      );

      if (hasCatalogValidationIssues && error.issues.length > 1) {
        throw new Error(
          'No pudimos guardar este paso porque hay selecciones estructuradas inválidas. Revisa los campos marcados e intenta nuevamente.',
        );
      }

      throw new Error(firstIssue?.message ?? 'No pudimos guardar este paso. Revisa los datos.');
    }

    throw error;
  }

  const dbKey = getDbKeyBySlug(stepSlug);
  const stepOrder = getStepOrderBySlug(stepSlug);

  const { error: upsertStepError } = await supabase.from('wizard_step_states').upsert(
    {
      user_id: userId,
      step_key: dbKey,
      step_order: stepOrder,
      is_completed: markCompleted,
      payload_jsonb: parsedPayload,
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

  const previousDraft = onboardingDraftStateSchema.parse(currentAggregatedDraft);
  const mergedDraft = onboardingDraftSchema.parse({
    ...previousDraft,
    [stepSlug]: parsedPayload,
  });

  const currentEmployabilityFlow = isRecord(currentAggregatedDraft.employabilityFlow)
    ? currentAggregatedDraft.employabilityFlow
    : null;
  const parsedEmployabilityFlow = employabilityFlowDraftSchema.safeParse(currentEmployabilityFlow);

  const mergedAggregatedDraft = {
    ...currentAggregatedDraft,
    ...mergedDraft,
    ...(currentEmployabilityFlow
      ? {
          employabilityFlow: {
            ...(parsedEmployabilityFlow.success
              ? parsedEmployabilityFlow.data
              : currentEmployabilityFlow),
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
