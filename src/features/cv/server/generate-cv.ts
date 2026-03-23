import {
  createDomainError,
  domainFailure,
  domainSuccess,
  toInternalDomainError,
} from '@/lib/contracts/index';
import { cvPreviewOutputSchema } from '@/features/cv/schemas/cv.schema';
import type { CvDomainInput, CvDomainOutput, CvDomainResult } from '@/features/cv/types/cv.types';

const buildCvPreviewOutput = (input: CvDomainInput): CvDomainOutput => {
  const firstBlock = input.translatedContent.blocks[0];
  if (!firstBlock) {
    throw createDomainError({
      code: 'VALIDATION_ERROR',
      message: 'Translated content requires at least one block',
      retryable: false,
    });
  }

  return cvPreviewOutputSchema.parse({
    sections: [
      {
        id: 'cv-section-summary',
        title: 'Professional Summary',
        content: firstBlock.content,
        sourceBlockIds: [firstBlock.id],
      },
    ],
    layout: {
      templateKey: input.templateKey,
      columns: input.templateKey === 'single-column' ? 1 : 2,
    },
    completeness: 'needs_review',
  });
};

export async function generateCv(input: CvDomainInput): Promise<CvDomainResult> {
  try {
    return domainSuccess(buildCvPreviewOutput(input));
  } catch (error) {
    return domainFailure(toInternalDomainError(error, 'Failed to generate CV preview'));
  }
}
