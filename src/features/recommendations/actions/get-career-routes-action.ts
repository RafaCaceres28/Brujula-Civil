'use server';

import { unstable_rethrow } from 'next/navigation';
import { requireUser } from '@/features/auth/server/require-user';
import {
  createDomainError,
  domainFailure,
  domainSuccess,
  isDomainError,
  type DomainMeta,
  type DomainResult,
} from '../../../lib/contracts/index';
import { getOnboardingOverview } from '../../wizard/server/get-onboarding-overview';
import { getProfile } from '../../profile/server/get-profile';
import type { GenerateCareerRoutesResult } from '../server/generate-career-routes';
import { resolveRecommendationState } from '../server/resolve-recommendation-state';
import type { RecommendationOutput } from '../schemas/recommendation.schema';
import { isOnboardingStorageReadError } from '../services/career-routes-error';

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
    const profile = await getProfile(user.id);
    const result = await resolveRecommendationState({
      userId: user.id,
      overview,
      profile,
      requestId: options?.requestId,
      now,
    });

    if (!result.ok) {
      return result;
    }

    return domainSuccess(result.data.recommendations, result.meta);
  } catch (error) {
    unstable_rethrow(error);
    if (isOnboardingStorageReadError(error)) {
      return domainFailure(
        createDomainError({
          code: 'EXTERNAL_DEPENDENCY_ERROR',
          message: 'Unable to read stored onboarding data',
          retryable: true,
        }),
        createMeta(nowIso, options?.requestId),
      );
    }
    if (
      isDomainError(error) &&
      error.code !== 'INTERNAL_ERROR' &&
      error.code !== 'VALIDATION_ERROR'
    ) {
      return domainFailure(error, createMeta(nowIso, options?.requestId));
    }
    console.error('Career routes action: unexpected context or generation failure');
    return createSafeActionFailure(nowIso, options?.requestId);
  }
}
