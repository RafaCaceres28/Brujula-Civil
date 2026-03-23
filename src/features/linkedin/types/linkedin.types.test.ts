import { describe, expectTypeOf, it } from 'vitest';
import type { DomainError, DomainResult } from '../../../lib/contracts/index';
import type {
  LinkedInContractVersion,
  LinkedInDomainError,
  LinkedInDomainInput,
  LinkedInDomainOutput,
  LinkedInDomainResult,
} from './linkedin.types';
import type { LinkedInNormalizedProfile, LinkedInSourceInput } from '../schemas/linkedin.schema';

describe('linkedin types contract', () => {
  it('keeps input and output aliases aligned with linkedin schema', () => {
    expectTypeOf<LinkedInDomainInput>().toEqualTypeOf<LinkedInSourceInput>();
    expectTypeOf<LinkedInDomainOutput>().toEqualTypeOf<LinkedInNormalizedProfile>();
  });

  it('exposes result as DomainResult with DomainError taxonomy', () => {
    expectTypeOf<LinkedInDomainError>().toEqualTypeOf<DomainError>();
    expectTypeOf<LinkedInDomainResult>().toEqualTypeOf<
      DomainResult<LinkedInDomainOutput, LinkedInDomainError>
    >();
  });

  it('keeps contract version in semantic version format', () => {
    const version: LinkedInContractVersion = '1.0.0';
    expectTypeOf(version).toEqualTypeOf<`${number}.${number}.${number}`>();

    // @ts-expect-error linkedin contract version requires semver pattern X.Y.Z
    const invalidVersion: LinkedInContractVersion = '1.0';
    void invalidVersion;
  });
});
