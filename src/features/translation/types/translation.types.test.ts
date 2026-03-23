import { describe, expectTypeOf, it } from 'vitest';
import type { DomainError } from '../../../lib/contracts/domain-error';
import type { DomainResult } from '../../../lib/contracts/domain-result';
import type {
  SupportedTranslationTone,
  TranslatedProfileContent,
  TranslationContractVersion,
  TranslationDomainError,
  TranslationDomainInput,
  TranslationDomainOutput,
  TranslationDomainResult,
  TranslationSourceProfile,
} from './translation.types';
import type {
  TranslationInput,
  TranslationOutput,
  TranslationTone,
} from '../schemas/translation.schema';

describe('translation types contract', () => {
  it('keeps input and output aliases aligned with translation schema', () => {
    expectTypeOf<TranslationDomainInput>().toEqualTypeOf<TranslationInput>();
    expectTypeOf<TranslationDomainOutput>().toEqualTypeOf<TranslationOutput>();
  });

  it('exposes result as DomainResult with DomainError taxonomy', () => {
    expectTypeOf<TranslationDomainError>().toEqualTypeOf<DomainError>();
    expectTypeOf<TranslationDomainResult>().toEqualTypeOf<
      DomainResult<TranslationDomainOutput, TranslationDomainError>
    >();
  });

  it('defines translated content shape required by downstream CV contract', () => {
    expectTypeOf<TranslatedProfileContent>().toMatchTypeOf<{
      blocks: Array<{
        id: string;
        content: string;
        sourceRef: string;
      }>;
      sourceRefMap: Record<string, string>;
      qualityFlags: string[];
    }>();
  });

  it('keeps source profile union and tone aligned to schema contracts', () => {
    expectTypeOf<TranslationSourceProfile>().toEqualTypeOf<
      TranslationDomainInput['sourceProfile']
    >();
    expectTypeOf<SupportedTranslationTone>().toEqualTypeOf<TranslationTone>();
  });

  it('keeps contract version in semantic version format', () => {
    const version: TranslationContractVersion = '1.0.0';
    expectTypeOf(version).toEqualTypeOf<`${number}.${number}.${number}`>();

    // @ts-expect-error translation contract version requires semver pattern X.Y.Z
    const invalidVersion: TranslationContractVersion = '1.0';
    void invalidVersion;
  });
});
