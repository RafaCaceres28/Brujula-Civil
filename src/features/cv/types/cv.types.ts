import type { DomainError, DomainResult } from '../../../lib/contracts/index';
import type { TranslationOutput } from '@/features/translation/schemas/translation.schema';
import type { CvPreviewInput, CvPreviewModel } from '../schemas/cv.schema';

export type CvLayoutTemplateKey = 'single-column' | 'modern' | 'compact';

export type CvCompletenessStatus = 'complete' | 'needs_review' | 'insufficient_data';

export type CvSection = {
  id: string;
  title: string;
  content: string;
  sourceBlockIds: string[];
};

export type CvEditableSection = Pick<CvSection, 'id' | 'title' | 'content'>;

export type CvPreviewEditableDraft = {
  sections: CvEditableSection[];
};

export type CvPreviewEditableModel = CvPreviewModel & {
  editableDraft: CvPreviewEditableDraft;
};

export type CvLayoutConfig = {
  templateKey: CvLayoutTemplateKey;
  columns: 1 | 2;
};

export type CvDomainInput = CvPreviewInput;

export type CvDomainOutput = CvPreviewModel;

export type CvDomainError = DomainError;

export type CvDomainResult = DomainResult<CvDomainOutput, CvDomainError>;

export type CvPreviewBoundaryResult = DomainResult<CvPreviewModel, DomainError>;

export type CvTranslatedContent = TranslationOutput;
