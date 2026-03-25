'use server';

import { requireUser } from '@/features/auth/server/require-user';
import {
  createDomainError,
  domainFailure,
  domainSuccess,
  type DomainMeta,
  type DomainResult,
} from '../../../lib/contracts/index';
import { getOnboardingOverview } from '../../wizard/server/get-onboarding-overview';
import { buildRecommendationInput } from '../services/build-recommendation-input';
import {
  generateCareerRoutes,
  type GenerateCareerRoutesResult,
} from '../server/generate-career-routes';
import { normalizeRecommendationRoutesExplainability } from '../services/recommendation-explanation-fallback';
import type { RecommendationOutput } from '../schemas/recommendation.schema';

const GET_CAREER_ROUTES_ACTION_SOURCE = 'recs.action.get-career-routes';

type GetCareerRoutesActionOptions = {
  requestId?: string;
  now?: Date;
};

function createMeta(nowIso: string, requestId?: string): DomainMeta {
  return {
    timestamp: nowIso,
    source: GET_CAREER_ROUTES_ACTION_SOURCE,
    ...(requestId ? { requestId } : {}),
  };
}

function createSafeActionFailure(
  nowIso: string,
  requestId?: string,
): DomainResult<RecommendationOutput> {
  return domainFailure(
    createDomainError({
      code: 'INTERNAL_ERROR',
      message: 'Unable to load structured profile for career recommendations',
      retryable: false,
    }),
    createMeta(nowIso, requestId),
  );
}

export async function getCareerRoutesAction(
  options?: GetCareerRoutesActionOptions,
): Promise<GenerateCareerRoutesResult> {
  const now = options?.now ?? new Date();
  const nowIso = now.toISOString();

  try {
    const user = await requireUser();
    const overview = await getOnboardingOverview(user.id);
    const recommendationInput = buildRecommendationInput({
      userId: user.id,
      overview,
    });

    const result = generateCareerRoutes(recommendationInput, {
      requestId: options?.requestId,
      now,
    });

    if (!result.ok) {
      return result;
    }

    return domainSuccess(
      {
        ...result.data,
        routes: normalizeRecommendationRoutesExplainability(result.data.routes),
      },
      result.meta,
    );
  } catch {
    return createSafeActionFailure(nowIso, options?.requestId);
  }
}
