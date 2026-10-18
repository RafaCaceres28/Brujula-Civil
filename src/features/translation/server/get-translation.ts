import { unstable_rethrow } from 'next/navigation';
import {
  createDomainError,
  domainFailure,
  domainSuccess,
  isDomainError,
  type DomainMeta,
  type DomainResult,
} from '../../../lib/contracts/index';
import { getProfile } from '../../profile/server/get-profile';
import { resolveRecommendationState } from '../../recommendations/server/resolve-recommendation-state';
import type { RecommendationOutput } from '../../recommendations/schemas/recommendation.schema';
import type { TranslationOutput } from '../schemas/translation.schema';
import { getOnboardingOverview } from '../../wizard/server/get-onboarding-overview';

const GET_TRANSLATION_SOURCE = 'translation.server.get-translation';

type TranslationContext = {
  profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>;
  recommendations: RecommendationOutput;
  selectedRouteId?: string;
  selectedRouteContext?: TranslationOutput['selectedRouteContext'];
};

export type GetTranslationResult = DomainResult<TranslationContext | null>;

function createMeta(requestId?: string): DomainMeta {
  return {
    timestamp: new Date().toISOString(),
    source: GET_TRANSLATION_SOURCE,
    ...(requestId ? { requestId } : {}),
  };
}

export async function getTranslation(
  userId: string,
  requestId?: string,
): Promise<GetTranslationResult> {
  const meta = createMeta(requestId);

  try {
    const [profile, overview] = await Promise.all([
      getProfile(userId),
      getOnboardingOverview(userId),
    ]);

    if (!profile) {
      return domainSuccess(null, meta);
    }

    const resolved = await resolveRecommendationState({ userId, overview, profile, requestId });
    if (!resolved.ok) return resolved;
    const {
      recommendations,
      selectedRoute,
      selectedRouteContext: persistedRouteContext,
    } = resolved.data;
    const selectedRouteId = selectedRoute?.selectedRouteId;

    let selectedRouteContext: TranslationOutput['selectedRouteContext'];

    if (selectedRouteId) {
      if (
        persistedRouteContext &&
        persistedRouteContext.selectedRouteId === selectedRouteId &&
        persistedRouteContext.recommendationSetId === recommendations.recommendationSetId
      ) {
        selectedRouteContext = {
          reasonSummarySnapshot: persistedRouteContext.reasonSummarySnapshot,
          fitLabelSnapshot: persistedRouteContext.fitLabelSnapshot,
          guidanceSnapshot: persistedRouteContext.guidanceSnapshot,
        };
      } else {
        const selectedRoute = recommendations.routes.find(
          (route) => route.routeId === selectedRouteId,
        );

        if (selectedRoute?.explanation) {
          selectedRouteContext = {
            reasonSummarySnapshot: selectedRoute.explanation.reasonSummary,
            fitLabelSnapshot: selectedRoute.explanation.fitLabel,
            guidanceSnapshot: selectedRoute.explanation.decisionGuidance,
          };
        }
      }
    }

    return domainSuccess(
      {
        profile,
        recommendations,
        ...(selectedRouteId ? { selectedRouteId } : {}),
        ...(selectedRouteContext ? { selectedRouteContext } : {}),
      },
      meta,
    );
  } catch (error) {
    unstable_rethrow(error);
    if (
      isDomainError(error) &&
      error.code !== 'INTERNAL_ERROR' &&
      error.code !== 'VALIDATION_ERROR'
    ) {
      return domainFailure(error, meta);
    }
    console.error('Translation context: profile or recommendation read failed');
    return domainFailure(
      createDomainError({
        code: 'INTERNAL_ERROR',
        message: 'Failed to load translation context',
        retryable: false,
      }),
      meta,
    );
  }
}
