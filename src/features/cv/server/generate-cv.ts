import {
  createDomainError,
  domainFailure,
  domainSuccess,
  toInternalDomainError,
} from '../../../lib/contracts/index';
import { cvPreviewOutputSchema } from '../schemas/cv.schema';
import type { CvDomainInput, CvDomainOutput, CvDomainResult } from '../types/cv.types';

const buildCvPreviewOutput = (input: CvDomainInput): CvDomainOutput => {
  const [summaryBlock, experienceBlock, strengthsBlock] = input.translatedContent.blocks;
  if (!summaryBlock) {
    throw createDomainError({
      code: 'VALIDATION_ERROR',
      message: 'Translated content requires at least one block',
      retryable: false,
    });
  }

  const sections: CvDomainOutput['sections'] = [
    {
      id: 'cv-section-summary',
      title: 'Professional Summary',
      content: summaryBlock.content,
      sourceBlockIds: [summaryBlock.id],
    },
  ];

  if (experienceBlock) {
    sections.push({
      id: 'cv-section-experience',
      title: 'Relevant Experience',
      content: experienceBlock.content,
      sourceBlockIds: [experienceBlock.id],
    });
  }

  if (strengthsBlock) {
    sections.push({
      id: 'cv-section-strengths',
      title: 'Core Strengths',
      content: strengthsBlock.content,
      sourceBlockIds: [strengthsBlock.id],
    });
  }

  const hasCoverageGaps = input.translatedContent.qualityFlags.includes('MISSING_CONTEXT');
  const selectedRouteId = input.selectedRouteId ?? input.translatedContent.selectedRouteId;
  const selectedRouteContext =
    input.selectedRouteContext ?? input.translatedContent.selectedRouteContext;

  return cvPreviewOutputSchema.parse({
    sections,
    layout: {
      templateKey: input.templateKey,
      columns: input.templateKey === 'single-column' ? 1 : 2,
    },
    completeness: hasCoverageGaps ? 'needs_review' : 'complete',
    ...(selectedRouteId ? { selectedRouteId } : {}),
    ...(selectedRouteContext ? { selectedRouteContext } : {}),
  });
};

export async function generateCv(input: CvDomainInput): Promise<CvDomainResult> {
  try {
    return domainSuccess(buildCvPreviewOutput(input));
  } catch (error) {
    return domainFailure(toInternalDomainError(error, 'Failed to generate CV preview'));
  }
}
