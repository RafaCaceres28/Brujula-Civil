import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { getProfile } from '../../profile/server/get-profile';
import { getOnboardingOverview } from '../../wizard/server/get-onboarding-overview';
import {
  persistRecommendationFlow,
  resolveRecommendationState,
} from './resolve-recommendation-state';
import {
  createValidationDomainError,
  createDomainError,
  domainFailure,
  domainSuccess,
  safeParseWithDomainError,
  isDomainError,
  type DomainMeta,
  type DomainResult,
} from '../../../lib/contracts/index';
import {
  recommendationSelectionSchema,
  selectedRouteContextSchema,
  type RecommendationSelection,
  type RecommendationOutput,
} from '../schemas/recommendation.schema';
import { normalizeRouteExplainability } from '../services/recommendation-explanation-fallback';

const SELECT_ROUTE_SOURCE = 'recs.server.select-route';

const selectCareerRouteInputSchema = z
  .object({
    userId: z.string().trim().min(1).max(128),
    recommendationSetId: z.string().trim().min(1).max(128),
    selectedRouteId: z.string().trim().min(1).max(128),
    requestId: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

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

function buildSelectedRouteContext(input: {
  recommendationSetId: string;
  selectedRouteId: string;
  selectedAt: string;
  employabilityFlow: { recommendations: RecommendationOutput };
}) {
  const selectedRoute = input.employabilityFlow.recommendations?.routes.find(
    (route) => route.routeId === input.selectedRouteId,
  );

  if (!selectedRoute) {
    return undefined;
  }

  const normalizedRoute = normalizeRouteExplainability(selectedRoute);

  return selectedRouteContextSchema.parse({
    recommendationSetId: input.recommendationSetId,
    selectedRouteId: input.selectedRouteId,
    reasonSummarySnapshot:
      normalizedRoute.explanation?.reasonSummary ?? normalizedRoute.reasonSummary,
    fitLabelSnapshot: normalizedRoute.explanation?.fitLabel ?? 'exploratorio',
    guidanceSnapshot:
      normalizedRoute.explanation?.decisionGuidance ??
      'Usa esta ruta como referencia inicial mientras reunes mas contexto.',
    capturedAt: input.selectedAt,
  });
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
    const [overview, profile] = await Promise.all([
      getOnboardingOverview(parsedInput.data.userId),
      getProfile(parsedInput.data.userId),
    ]);
    const resolved = await resolveRecommendationState({
      userId: parsedInput.data.userId,
      overview,
      profile,
      requireCurrentSet: parsedInput.data.recommendationSetId,
      requestId,
      now: new Date(nowIso),
    });
    if (!resolved.ok) return resolved;
    const currentAggregatedDraft = isRecord(overview.state?.aggregated_draft_jsonb)
      ? overview.state.aggregated_draft_jsonb
      : {};
    const currentFlow = resolved.data;

    if (
      !currentFlow.recommendations.routes.some(
        (route) => route.routeId === parsedInput.data.selectedRouteId,
      )
    ) {
      return domainFailure(
        createValidationDomainError('Selected route does not belong to active recommendation set'),
        meta,
      );
    }

    const parsedSelection = recommendationSelectionSchema.parse({
      recommendationSetId: parsedInput.data.recommendationSetId,
      selectedRouteId: parsedInput.data.selectedRouteId,
      selectedAt: nowIso,
    });
    const selectedRouteContext = buildSelectedRouteContext({
      recommendationSetId: parsedInput.data.recommendationSetId,
      selectedRouteId: parsedInput.data.selectedRouteId,
      selectedAt: nowIso,
      employabilityFlow: currentFlow,
    });

    const nextEmployabilityFlow = {
      ...(isRecord(currentAggregatedDraft.employabilityFlow)
        ? currentAggregatedDraft.employabilityFlow
        : {}),
      selectedRoute: parsedSelection,
      ...(selectedRouteContext ? { selectedRouteContext } : {}),
      selectedRecommendation: parsedSelection,
      lastUpdatedAt: nowIso,
    };
    await persistRecommendationFlow(
      parsedInput.data.userId,
      overview,
      nextEmployabilityFlow,
      nowIso,
    );

    return domainSuccess(parsedSelection, meta);
  } catch (error) {
    unstable_rethrow(error);
    return domainFailure(
      isDomainError(error)
        ? error
        : createDomainError({
            code: 'INTERNAL_ERROR',
            message: 'Failed to select career route',
            retryable: false,
          }),
      meta,
    );
  }
}
