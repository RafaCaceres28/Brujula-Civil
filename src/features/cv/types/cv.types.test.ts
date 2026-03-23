import { describe, expectTypeOf, it } from 'vitest';
import type { DomainError, DomainResult } from '../../../lib/contracts/index';
import type {
  CvDomainError,
  CvDomainInput,
  CvDomainOutput,
  CvDomainResult,
  CvEditableSection,
  CvPreviewBoundaryResult,
  CvPreviewEditableDraft,
  CvPreviewEditableModel,
  CvTranslatedContent,
} from './cv.types';
import type { CvPreviewInput, CvPreviewModel } from '../schemas/cv.schema';
import type { TranslationOutput } from '../../translation/schemas/translation.schema';

describe('cv types contract', () => {
  it('keeps domain input and output aliases aligned with CV schemas', () => {
    expectTypeOf<CvDomainInput>().toEqualTypeOf<CvPreviewInput>();
    expectTypeOf<CvDomainOutput>().toEqualTypeOf<CvPreviewModel>();
  });

  it('exposes result aliases aligned to DomainResult and DomainError', () => {
    expectTypeOf<CvDomainError>().toEqualTypeOf<DomainError>();
    expectTypeOf<CvDomainResult>().toEqualTypeOf<DomainResult<CvDomainOutput, CvDomainError>>();
    expectTypeOf<CvPreviewBoundaryResult>().toEqualTypeOf<
      DomainResult<CvPreviewModel, DomainError>
    >();
  });

  it('defines editable preview draft and editable model shape for UI boundary', () => {
    expectTypeOf<CvEditableSection>().toMatchTypeOf<{
      id: string;
      title: string;
      content: string;
    }>();

    expectTypeOf<CvPreviewEditableDraft>().toMatchTypeOf<{
      sections: CvEditableSection[];
    }>();

    expectTypeOf<CvPreviewEditableModel>().toMatchTypeOf<
      CvPreviewModel & {
        editableDraft: CvPreviewEditableDraft;
      }
    >();
  });

  it('keeps translation output alias required by CV input pipeline', () => {
    expectTypeOf<CvTranslatedContent>().toEqualTypeOf<TranslationOutput>();
  });
});
