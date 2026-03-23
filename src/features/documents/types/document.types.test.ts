import { describe, expectTypeOf, it } from 'vitest';
import type { DomainError, DomainResult } from '../../../lib/contracts/index';
import type {
  DocumentGenerationStatus,
  DocumentsContractVersion,
  DocumentsDomainError,
  DocumentsDomainInput,
  DocumentsDomainOutput,
  DocumentsDomainResult,
  SupportedDocumentFormat,
} from './document.types';
import type {
  PdfFormat,
  PdfGenerationInput,
  PdfGenerationOutput,
  PdfGenerationStatus,
} from '../schemas/document.schema';

describe('documents types contract', () => {
  it('keeps input and output aliases aligned with documents schema', () => {
    expectTypeOf<DocumentsDomainInput>().toEqualTypeOf<PdfGenerationInput>();
    expectTypeOf<DocumentsDomainOutput>().toEqualTypeOf<PdfGenerationOutput>();
  });

  it('exposes result as DomainResult with DomainError taxonomy', () => {
    expectTypeOf<DocumentsDomainError>().toEqualTypeOf<DomainError>();
    expectTypeOf<DocumentsDomainResult>().toEqualTypeOf<
      DomainResult<DocumentsDomainOutput, DocumentsDomainError>
    >();
  });

  it('keeps format and status aliases aligned to schema enums', () => {
    expectTypeOf<SupportedDocumentFormat>().toEqualTypeOf<PdfFormat>();
    expectTypeOf<DocumentGenerationStatus>().toEqualTypeOf<PdfGenerationStatus>();
  });

  it('keeps contract version in semantic version format', () => {
    const version: DocumentsContractVersion = '1.0.0';
    expectTypeOf(version).toEqualTypeOf<`${number}.${number}.${number}`>();

    // @ts-expect-error documents contract version requires semver pattern X.Y.Z
    const invalidVersion: DocumentsContractVersion = '1.0';
    void invalidVersion;
  });
});
