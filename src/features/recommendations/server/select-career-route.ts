import { createClient } from '@/lib/supabase/server';
import {
  createValidationDomainError,
  domainFailure,
  domainSuccess,
  safeParseWithDomainError,
  toInternalDomainError,
  type DomainMeta,
  type DomainResult,
} from '../../../lib/contracts/index';
import { z } from 'zod';
import { employabilityFlowDraftSchema } from '../../wizard/schemas/wizard-state.schema';
import {
  recommendationSelectionSchema,
  type RecommendationSelection,
} from '../schemas/recommendation.schema';

const SELECT_ROUTE_SOURCE = 'recs.server.select-route';

const selectCareerRouteInputSchema = z
  .object({
    userId: z.string().trim().min(1).max(128),
    recommendationSetId: z.string().trim().min(1).max(128),
    selectedRouteId: z.string().trim().min(1).max(128),
    requestId: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

type SelectCareerRouteInput = z.infer<typeof selectCareerRouteInputSchema>;
export type SelectCareerRouteResult = DomainResult<RecommendationSelection>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createMeta(nowIso: string, requestId?: string): DomainMeta {
  return {
    timestamp: nowIso,
    source: SELECT_ROUTE_SOURCE,
    ...(requestId ? { requestId } : {}),
  };
}

function validateRouteSelection(
  input: SelectCareerRouteInput,
  employabilityFlow: z.infer<typeof employabilityFlowDraftSchema>,
) {
  const recommendations = employabilityFlow.recommendations;

  if (!recommendations) {
    return createValidationDomainError('No active recommendation shortlist found for this user');
  }

  if (recommendations.recommendationSetId !== input.recommendationSetId) {
    return createValidationDomainError('Recommendation set does not match active shortlist', {
      activeRecommendationSetId: recommendations.recommendationSetId,
      requestedRecommendationSetId: input.recommendationSetId,
    });
  }

  const belongsToSet = recommendations.routes.some(
    (route) => route.routeId === input.selectedRouteId,
  );

  if (!belongsToSet) {
    return createValidationDomainError(
      'Selected route does not belong to active recommendation set',
    );
  }

  return null;
}

export async function selectCareerRoute(input: unknown): Promise<SelectCareerRouteResult> {
  const nowIso = new Date().toISOString();

  const parsedInput = safeParseWithDomainError(selectCareerRouteInputSchema, input, {
    message: 'Invalid select route payload',
  });

  const requestId = parsedInput.ok ? parsedInput.data.requestId : undefined;
  const meta = createMeta(nowIso, requestId);

  if (!parsedInput.ok) {
    return domainFailure(parsedInput.error, meta);
  }

  try {
    const supabase = await createClient();

    const { data: currentState, error: currentStateError } = await supabase
      .from('user_wizard_state')
      .select('aggregated_draft_jsonb')
      .eq('user_id', parsedInput.data.userId)
      .maybeSingle();

    if (currentStateError) {
      return domainFailure(
        toInternalDomainError(currentStateError, 'Failed to load recommendation draft state'),
        meta,
      );
    }

    const currentAggregatedDraft = isRecord(currentState?.aggregated_draft_jsonb)
      ? currentState.aggregated_draft_jsonb
      : {};
    const parsedFlow = employabilityFlowDraftSchema.safeParse(
      currentAggregatedDraft.employabilityFlow,
    );
    const currentFlow = parsedFlow.success
      ? parsedFlow.data
      : employabilityFlowDraftSchema.parse({});

    const selectionValidationError = validateRouteSelection(parsedInput.data, currentFlow);
    if (selectionValidationError) {
      return domainFailure(selectionValidationError, meta);
    }

    const parsedSelection = recommendationSelectionSchema.parse({
      recommendationSetId: parsedInput.data.recommendationSetId,
      selectedRouteId: parsedInput.data.selectedRouteId,
      selectedAt: nowIso,
    });

    const nextEmployabilityFlow = employabilityFlowDraftSchema.parse({
      ...currentFlow,
      selectedRoute: parsedSelection,
      selectedRecommendation: parsedSelection,
      lastUpdatedAt: nowIso,
    });

    const nextAggregatedDraft = {
      ...currentAggregatedDraft,
      employabilityFlow: nextEmployabilityFlow,
    };

    const { error: updateError } = await supabase
      .from('user_wizard_state')
      .update({
        aggregated_draft_jsonb: nextAggregatedDraft,
        last_saved_at: nowIso,
      })
      .eq('user_id', parsedInput.data.userId);

    if (updateError) {
      return domainFailure(
        toInternalDomainError(updateError, 'Failed to persist selected career route'),
        meta,
      );
    }

    return domainSuccess(parsedSelection, meta);
  } catch (error) {
    return domainFailure(toInternalDomainError(error, 'Failed to select career route'), meta);
  }
}
