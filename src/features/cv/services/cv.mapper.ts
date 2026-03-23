import {
  createValidationDomainError,
  domainFailure,
  domainSuccess,
  type DomainResult,
} from '../../../lib/contracts/index';
import { cvPreviewInputSchema, cvPreviewOutputSchema } from '../schemas/cv.schema';
import type {
  CvDomainInput,
  CvDomainOutput,
  CvLayoutTemplateKey,
  CvPreviewBoundaryResult,
} from '../types/cv.types';
import type { TranslationOutput } from '../../translation/schemas/translation.schema';

type TranslationToCvInput = {
  userId: string;
  profileSnapshotId: string;
  translatedContent: TranslationOutput;
  templateKey: CvLayoutTemplateKey;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeEditableCvPreviewInput(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  if (!Array.isArray(value.sections)) {
    return value;
  }

  const normalizedSections = value.sections.map((section) => {
    if (!isRecord(section)) {
      return section;
    }

    return {
      ...section,
      title: typeof section.title === 'string' ? section.title.trim() : section.title,
      content: typeof section.content === 'string' ? section.content.trim() : section.content,
    };
  });

  return {
    ...value,
    sections: normalizedSections,
  };
}

export function mapTranslationOutputToCvInput(input: TranslationToCvInput): CvDomainInput {
  return cvPreviewInputSchema.parse(input);
}

export function parseEditableCvPreviewBoundary(input: unknown): CvPreviewBoundaryResult {
  const parsed = cvPreviewOutputSchema.safeParse(normalizeEditableCvPreviewInput(input));
  if (!parsed.success) {
    return domainFailure(
      createValidationDomainError('Invalid editable CV preview payload', {
        issues: parsed.error.issues,
      }),
    );
  }

  return domainSuccess(parsed.data);
}

export function ensureEditableCvPreview(input: unknown): DomainResult<CvDomainOutput> {
  return parseEditableCvPreviewBoundary(input);
}
