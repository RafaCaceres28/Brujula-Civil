export { DOMAIN_ERROR_CODES, isDomainErrorCode, type DomainErrorCode } from './domain-error-codes';
export {
  createDomainError,
  createValidationDomainError,
  isDomainError,
  toInternalDomainError,
  type DomainError,
  type DomainErrorInput,
} from './domain-error';
export {
  domainFailure,
  domainSuccess,
  isDomainFailure,
  isDomainSuccess,
  type DomainFailure,
  type DomainResult,
  type DomainSuccess,
} from './domain-result';
export { type DomainMeta } from './domain-meta';
export {
  domainIdSchema,
  domainMetaSchema,
  localeSchema,
  parseDomainId,
  parseDomainMeta,
  parseLocale,
  timestampSchema,
} from './shared.schema';
export {
  mapZodIssues,
  safeParseWithDomainError,
  type ZodIssueDetail,
  type ZodSafeParseOptions,
} from './zod-helpers';
export {
  recommendationInputSnapshotSchema,
  recommendationOutputSchema,
  recommendationRouteSchema,
  recommendationSelectionSchema,
  type RecommendationInputSnapshot,
  type RecommendationOutput,
  type RecommendationRoute,
  type RecommendationSelection,
} from '../../features/recommendations/schemas/recommendation.schema';
export type {
  RecommendationContractVersion,
  RecommendationDomainError,
  RecommendationDomainInput,
  RecommendationDomainOutput,
  RecommendationDomainResult,
  RecommendationDomainRoute,
  RecommendationDomainSelection,
} from '../../features/recommendations/types/recommendation.types';
