import {
  domainFailure,
  domainSuccess,
  toInternalDomainError,
  type DomainMeta,
  type DomainResult,
} from '../../../lib/contracts/index';
import { getProfile } from '../../profile/server/get-profile';
import { buildRecommendationInput } from '../../recommendations/services/build-recommendation-input';
import {
  generateCareerRoutes,
  type GenerateCareerRoutesResult,
} from '../../recommendations/server/generate-career-routes';
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

function withMeta(
  result: GenerateCareerRoutesResult,
  meta: DomainMeta,
): GenerateCareerRoutesResult {
  return {
    ...result,
    meta,
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

    const selectedRouteId = overview.employabilityFlow?.selectedRoute?.selectedRouteId;
    const persistedRouteContext = overview.employabilityFlow?.selectedRouteContext;
    let recommendations = overview.employabilityFlow?.recommendations;

    if (!recommendations) {
      const recommendationInput = buildRecommendationInput({
        userId,
        overview,
      });
      const generatedResult = withMeta(
        generateCareerRoutes(recommendationInput, { requestId }),
        meta,
      );

      if (!generatedResult.ok) {
        return generatedResult;
      }

      recommendations = generatedResult.data;
    }

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
    return domainFailure(toInternalDomainError(error, 'Failed to load translation context'), meta);
  }
}
