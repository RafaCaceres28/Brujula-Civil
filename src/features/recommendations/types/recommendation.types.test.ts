import { describe, expectTypeOf, it } from 'vitest';
import type { DomainError } from '@/lib/contracts/domain-error';
import type { DomainResult } from '@/lib/contracts/domain-result';
import type {
  RecommendationContractVersion,
  RecommendationDomainError,
  RecommendationDomainInput,
  RecommendationDomainOutput,
  RecommendationDomainResult,
  RecommendationDomainRoute,
  RecommendationDomainSelection,
} from './recommendation.types';
import type {
  RecommendationInputSnapshot,
  RecommendationOutput,
  RecommendationRoute,
  RecommendationSelection,
} from '../schemas/recommendation.schema';

describe('recommendation types contract', () => {
  it('keeps recommendation input/output aliases aligned with schemas', () => {
    expectTypeOf<RecommendationDomainInput>().toEqualTypeOf<RecommendationInputSnapshot>();
    expectTypeOf<RecommendationDomainOutput>().toEqualTypeOf<RecommendationOutput>();
  });

  it('keeps route and selection aliases aligned with schemas', () => {
    expectTypeOf<RecommendationDomainRoute>().toEqualTypeOf<RecommendationRoute>();
    expectTypeOf<RecommendationDomainSelection>().toEqualTypeOf<RecommendationSelection>();
  });

  it('exposes result as DomainResult with DomainError taxonomy', () => {
    expectTypeOf<RecommendationDomainError>().toEqualTypeOf<DomainError>();
    expectTypeOf<RecommendationDomainResult>().toEqualTypeOf<
      DomainResult<RecommendationDomainOutput, RecommendationDomainError>
    >();
  });

  it('keeps contract version in semantic version format', () => {
    const version: RecommendationContractVersion = '1.0.0';
    expectTypeOf(version).toEqualTypeOf<`${number}.${number}.${number}`>();

    // @ts-expect-error recommendation contract version requires semver pattern X.Y.Z
    const invalidVersion: RecommendationContractVersion = '1.0';
    void invalidVersion;
  });
});
