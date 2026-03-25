import { createClient } from '@/lib/supabase/server';
import { selectedRouteContextSchema } from '../../recommendations/schemas/recommendation.schema';
import {
  employabilityFlowDraftSchema,
  onboardingDraftStateSchema,
} from '../schemas/wizard-state.schema';
import type { OnboardingOverview } from '../types/wizard.types';

function isSameSelectedRoute(
  selectedRoute:
    | {
        recommendationSetId: string;
        selectedRouteId: string;
      }
    | undefined,
  selectedRouteContext:
    | {
        recommendationSetId: string;
        selectedRouteId: string;
      }
    | undefined,
) {
  if (!selectedRoute || !selectedRouteContext) {
    return true;
  }

  return (
    selectedRoute.recommendationSetId === selectedRouteContext.recommendationSetId &&
    selectedRoute.selectedRouteId === selectedRouteContext.selectedRouteId
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEmployabilityFlow(input: unknown) {
  if (!isRecord(input)) {
    return undefined;
  }

  const parsedFlow = employabilityFlowDraftSchema.safeParse(input);

  if (parsedFlow.success) {
    if (parsedFlow.data.selectedRoute || !parsedFlow.data.selectedRecommendation) {
      return parsedFlow.data;
    }

    return {
      ...parsedFlow.data,
      selectedRoute: parsedFlow.data.selectedRecommendation,
    };
  }

  const sanitizedInput = { ...input };

  if ('selectedRouteContext' in sanitizedInput) {
    delete sanitizedInput.selectedRouteContext;
  }

  const parsedWithoutContext = employabilityFlowDraftSchema.safeParse(sanitizedInput);

  if (!parsedWithoutContext.success) {
    return undefined;
  }

  const selectedRoute =
    parsedWithoutContext.data.selectedRoute ?? parsedWithoutContext.data.selectedRecommendation;

  if (!selectedRoute) {
    return parsedWithoutContext.data;
  }

  if (
    !isRecord(input.selectedRouteContext) ||
    !isSameSelectedRoute(
      selectedRoute,
      input.selectedRouteContext as {
        recommendationSetId: string;
        selectedRouteId: string;
      },
    )
  ) {
    return {
      ...parsedWithoutContext.data,
      ...(parsedWithoutContext.data.selectedRoute
        ? {}
        : { selectedRoute: parsedWithoutContext.data.selectedRecommendation }),
    };
  }

  const parsedSelectedRouteContext = selectedRouteContextSchema.safeParse(
    input.selectedRouteContext,
  );

  if (!parsedSelectedRouteContext.success) {
    return {
      ...parsedWithoutContext.data,
      ...(parsedWithoutContext.data.selectedRoute
        ? {}
        : { selectedRoute: parsedWithoutContext.data.selectedRecommendation }),
    };
  }

  return {
    ...parsedWithoutContext.data,
    ...(parsedWithoutContext.data.selectedRoute
      ? {}
      : { selectedRoute: parsedWithoutContext.data.selectedRecommendation }),
    selectedRouteContext: parsedSelectedRouteContext.data,
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
  const draft = onboardingDraftStateSchema.parse(aggregatedDraft);
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
