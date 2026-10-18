import { createHash } from 'node:crypto';
import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  createDomainError,
  createValidationDomainError,
  domainFailure,
  domainSuccess,
  isDomainError,
  type DomainResult,
} from '../../../lib/contracts/index';
import type { ProfileReadOutput } from '../../profile/types/profile.types';
import type { OnboardingOverview } from '../../wizard/types/wizard.types';
import {
  recommendationOutputSchema,
  recommendationSelectionSchema,
  selectedRouteContextSchema,
  type RecommendationOutput,
  type RecommendationSelection,
  type SelectedRouteContext,
} from '../schemas/recommendation.schema';
import { buildRecommendationContext } from '../services/build-recommendation-input';
import {
  getRecommendationRuleInputs,
  hasRecommendationSignals,
} from '../services/route-recommendation-rules';
import { generateCareerRoutes } from './generate-career-routes';

// Bump when rules, catalogs, gate or generated explanations change their semantics.
const RECOMMENDATION_RULES_VERSION = 'v1';

type RecommendationState = {
  recommendations: RecommendationOutput;
  selectedRoute?: RecommendationSelection;
  selectedRouteContext?: SelectedRouteContext;
};

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function persistRecommendationFlow(
  userId: string,
  overview: OnboardingOverview,
  flow: Record<string, unknown>,
  nowIso: string,
): Promise<void> {
  const supabase = await createClient();
  const original = overview.state?.aggregated_draft_jsonb;
  const payload = {
    aggregated_draft_jsonb: { ...record(original), employabilityFlow: flow },
    last_saved_at: nowIso,
  };
  const table = supabase.from('user_wizard_state');
  const query = overview.state
    ? table
        .update(payload)
        .eq('user_id', userId)
        .eq('aggregated_draft_jsonb', JSON.stringify(original))
    : table.insert({ user_id: userId, ...payload });
  const { data, error } = await query.select('user_id').maybeSingle();
  if (error) {
    throw createDomainError({
      code: error.code === '23505' ? 'CONFLICT' : 'EXTERNAL_DEPENDENCY_ERROR',
      message: 'Unable to persist current career recommendations',
      retryable: true,
    });
  }
  if (!data)
    throw createDomainError({
      code: 'CONFLICT',
      message: 'Recommendation draft changed; reload before continuing',
      retryable: true,
    });
}

export async function resolveRecommendationState(params: {
  userId: string;
  overview: OnboardingOverview;
  profile: ProfileReadOutput | null;
  now?: Date;
  requestId?: string;
  requireCurrentSet?: string;
}): Promise<DomainResult<RecommendationState>> {
  const now = params.now ?? new Date();
  const meta = {
    timestamp: now.toISOString(),
    source: 'recs.server.resolve-state',
    ...(params.requestId ? { requestId: params.requestId } : {}),
  };
  try {
    if (
      (params.profile && params.profile.userId !== params.userId) ||
      (params.overview.state?.user_id && params.overview.state.user_id !== params.userId)
    )
      throw new Error('Mismatched recommendation owner');
    const { input, source } = buildRecommendationContext({
      userId: params.userId,
      overview: params.overview,
      careerHistory: params.profile?.careerHistory,
    });
    // Never let a matching cache identity bypass canonical validation or sufficiency.
    const hasSignals = hasRecommendationSignals(input, source);
    const rawFlow = record(record(params.overview.state?.aggregated_draft_jsonb).employabilityFlow);
    const rawRecommendations = rawFlow.recommendations;
    const cached =
      rawRecommendations === undefined
        ? undefined
        : recommendationOutputSchema.parse(rawRecommendations);
    if (!hasSignals) {
      const insufficient = generateCareerRoutes(input, {
        source,
        now,
        requestId: params.requestId,
      });
      if (!insufficient.ok) return insufficient;
      throw new Error('Inconsistent recommendation gate');
    }
    const digest = createHash('sha256')
      .update(
        JSON.stringify({
          rulesVersion: RECOMMENDATION_RULES_VERSION,
          userId: params.userId,
          sourceKind: source.kind,
          effective: getRecommendationRuleInputs(input),
        }),
      )
      .digest('hex');
    input.snapshotId = `recsrc-${RECOMMENDATION_RULES_VERSION}-${digest}`;

    if (
      params.requireCurrentSet &&
      (!cached ||
        cached.sourceSnapshotId !== input.snapshotId ||
        cached.recommendationSetId !== params.requireCurrentSet)
    ) {
      return domainFailure(
        createValidationDomainError('Recommendation set does not match current source', {
          ...(cached ? { activeRecommendationSetId: cached.recommendationSetId } : {}),
          requestedRecommendationSetId: params.requireCurrentSet,
          staleExplanationContext: true,
          reprocessAction: 'refresh_recommendations',
        }),
        meta,
      );
    }

    if (cached?.sourceSnapshotId === input.snapshotId) {
      const parsedSelection = recommendationSelectionSchema.safeParse(
        'selectedRoute' in rawFlow ? rawFlow.selectedRoute : rawFlow.selectedRecommendation,
      );
      const selectedRoute =
        parsedSelection.success &&
        parsedSelection.data.recommendationSetId === cached.recommendationSetId &&
        cached.routes.some((route) => route.routeId === parsedSelection.data.selectedRouteId)
          ? parsedSelection.data
          : undefined;
      const context = selectedRouteContextSchema.safeParse(rawFlow.selectedRouteContext);
      const selectedRouteContext =
        selectedRoute &&
        context.success &&
        context.data.recommendationSetId === selectedRoute.recommendationSetId &&
        context.data.selectedRouteId === selectedRoute.selectedRouteId
          ? context.data
          : undefined;
      return domainSuccess(
        {
          recommendations: cached,
          ...(selectedRoute ? { selectedRoute } : {}),
          ...(selectedRouteContext ? { selectedRouteContext } : {}),
        },
        meta,
      );
    }

    const generated = generateCareerRoutes(input, { source, now, requestId: params.requestId });
    if (!generated.ok) return generated;
    const nextFlow = { ...rawFlow };
    delete nextFlow.selectedRoute;
    delete nextFlow.selectedRecommendation;
    delete nextFlow.selectedRouteContext;
    nextFlow.recommendations = generated.data;
    nextFlow.lastUpdatedAt = meta.timestamp;
    await persistRecommendationFlow(params.userId, params.overview, nextFlow, meta.timestamp);
    return domainSuccess({ recommendations: generated.data }, meta);
  } catch (error) {
    unstable_rethrow(error);
    return domainFailure(
      isDomainError(error)
        ? error
        : createDomainError({
            code: 'INTERNAL_ERROR',
            message: 'Unable to resolve current career recommendations',
            retryable: false,
          }),
      meta,
    );
  }
}
