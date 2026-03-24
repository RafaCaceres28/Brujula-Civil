import { z } from 'zod';
import { domainIdSchema, timestampSchema } from '../../../lib/contracts/index';
import {
  cvCompletenessStatusSchema,
  cvLayoutConfigSchema,
  cvPreviewOutputSchema,
} from '../../cv/schemas/cv.schema';
import { pdfGenerationStatusSchema } from '../../documents/schemas/document.schema';
import {
  translatedBlockSchema,
  translationQualityFlagSchema,
} from '../../translation/schemas/translation.schema';
import {
  recommendationOutputSchema,
  recommendationSelectionSchema,
} from '../../recommendations/schemas/recommendation.schema';

const sourceRefMapSchema = z.record(domainIdSchema, domainIdSchema);

export const employabilityFlowStateSchema = z.enum([
  'idle',
  'profile_ready',
  'translation_ready',
  'preview_editing',
  'preview_confirmed',
  'export_queued',
  'export_generated',
  'export_failed',
]);

export const translationTraceSchema = z
  .object({
    blocks: z.array(translatedBlockSchema).min(1),
    sourceRefMap: sourceRefMapSchema,
    qualityFlags: z.array(translationQualityFlagSchema),
    generatedAt: timestampSchema,
  })
  .strict();

export const cvPreviewTraceSchema = z
  .object({
    previewVersionId: domainIdSchema,
    sections: cvPreviewOutputSchema.shape.sections,
    layout: cvLayoutConfigSchema,
    completeness: cvCompletenessStatusSchema,
    editedAt: timestampSchema,
    isUserEdited: z.boolean(),
  })
  .strict();

export const pdfExportTraceSchema = z
  .object({
    requestId: domainIdSchema,
    previewVersionId: domainIdSchema,
    documentId: domainIdSchema.nullable(),
    status: pdfGenerationStatusSchema,
    storagePath: z.string().trim().min(1).max(512).nullable(),
    downloadUrl: z.string().url().max(2048).nullable(),
    requestedAt: timestampSchema,
  })
  .strict();

export const cvPreviewDraftSchema = z
  .object({
    previewVersionId: domainIdSchema,
    cvPreview: cvPreviewOutputSchema,
    isUserEdited: z.boolean(),
    profileSnapshotId: domainIdSchema.optional(),
    sourceRefMap: sourceRefMapSchema.default({}),
    updatedAt: timestampSchema,
  })
  .strict();

export const employabilityFlowDraftSchema = z
  .object({
    flowState: employabilityFlowStateSchema.optional(),
    userId: domainIdSchema.optional(),
    profileSnapshotId: domainIdSchema.optional(),
    translation: translationTraceSchema.optional(),
    cvPreview: cvPreviewTraceSchema.optional(),
    export: pdfExportTraceSchema.optional(),
    recommendations: recommendationOutputSchema.optional(),
    selectedRoute: recommendationSelectionSchema.optional(),
    selectedRecommendation: recommendationSelectionSchema.optional(),
    cvPreviewDraft: cvPreviewDraftSchema.optional(),
    lastUpdatedAt: timestampSchema.optional(),
    lastOnboardingStep: z.string().trim().min(1).max(64).optional(),
  })
  .passthrough();
