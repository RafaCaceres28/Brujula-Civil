import {
  createDomainError,
  createValidationDomainError,
  domainFailure,
  domainSuccess,
  safeParseWithDomainError,
  type DomainMeta,
  type DomainResult,
} from '../../../lib/contracts/index';
import {
  recommendationInputSnapshotSchema,
  recommendationOutputSchema,
  type RecommendationInputSnapshot,
  type RecommendationOutput,
} from '../schemas/recommendation.schema';
import {
  buildCareerRouteShortlist,
  hasRecommendationSignals,
} from '../services/route-recommendation-rules';

const GENERATE_ROUTES_SOURCE = 'recs.server.generate-routes';

type GenerateCareerRoutesOptions = {
  requestId?: string;
  now?: Date;
};

export type GenerateCareerRoutesResult = DomainResult<RecommendationOutput>;

function createMeta(nowIso: string, requestId?: string): DomainMeta {
  return {
    timestamp: nowIso,
    source: GENERATE_ROUTES_SOURCE,
    ...(requestId ? { requestId } : {}),
  };
}

function createRecommendationSetId(input: RecommendationInputSnapshot, nowIso: string): string {
  const compactIso = nowIso.replace(/[-:.TZ]/g, '').slice(0, 14);
  return `recset-${input.snapshotId}-${compactIso}`;
}

export function generateCareerRoutes(
  input: unknown,
  options?: GenerateCareerRoutesOptions,
): GenerateCareerRoutesResult {
  const nowIso = (options?.now ?? new Date()).toISOString();
  const meta = createMeta(nowIso, options?.requestId);

  try {
    const parsedInput = safeParseWithDomainError(recommendationInputSnapshotSchema, input, {
      message: 'Invalid recommendation input payload',
    });

    if (!parsedInput.ok) {
      return domainFailure(parsedInput.error, meta);
    }

    if (!hasRecommendationSignals(parsedInput.data)) {
      return domainFailure(
        createValidationDomainError('Insufficient structured profile to generate career routes'),
        meta,
      );
    }

    const routes = buildCareerRouteShortlist(parsedInput.data);

    if (routes.length < 3 || routes.length > 5) {
      return domainFailure(
        createValidationDomainError('Career route shortlist must contain between 3 and 5 entries', {
          routesCount: routes.length,
        }),
        meta,
      );
    }

    const parsedOutput = safeParseWithDomainError(
      recommendationOutputSchema,
      {
        recommendationSetId: createRecommendationSetId(parsedInput.data, nowIso),
        generatedAt: nowIso,
        routes,
        sourceSnapshotId: parsedInput.data.snapshotId,
      },
      {
        message: 'Failed to generate a valid recommendation shortlist',
      },
    );

    if (!parsedOutput.ok) {
      return domainFailure(parsedOutput.error, meta);
    }

    return domainSuccess(parsedOutput.data, meta);
  } catch {
    return domainFailure(
      createDomainError({
        code: 'INTERNAL_ERROR',
        message: 'Unable to generate career routes at this time',
        retryable: false,
      }),
      meta,
    );
  }
}
