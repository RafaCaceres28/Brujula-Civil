import type { DomainError } from '@/lib/contracts/domain-error';
import type { DomainResult } from '@/lib/contracts/domain-result';
import type {
  RecommendationInputSnapshot,
  RecommendationOutput,
  RecommendationRoute,
  RecommendationSelection,
} from '../schemas/recommendation.schema';

export type RecommendationContractVersion = `${number}.${number}.${number}`;

export type RecommendationDomainInput = RecommendationInputSnapshot;
export type RecommendationDomainOutput = RecommendationOutput;
export type RecommendationDomainRoute = RecommendationRoute;
export type RecommendationDomainSelection = RecommendationSelection;

export type RecommendationDomainError = DomainError;
export type RecommendationDomainResult = DomainResult<
  RecommendationDomainOutput,
  RecommendationDomainError
>;
