import { z } from 'zod';
import { domainIdSchema } from '../../../lib/contracts/shared.schema';
import { translationOutputSchema } from '../../translation/schemas/translation.schema';

const MAX_SECTION_TITLE_LENGTH = 120;
const MAX_SECTION_CONTENT_LENGTH = 2000;

export const cvLayoutTemplateSchema = z.enum(['single-column', 'modern', 'compact']);

export const cvCompletenessStatusSchema = z.enum(['complete', 'needs_review', 'insufficient_data']);

export const cvSectionSchema = z
  .object({
    id: domainIdSchema,
    title: z.string().trim().min(1).max(MAX_SECTION_TITLE_LENGTH),
    content: z.string().trim().min(1).max(MAX_SECTION_CONTENT_LENGTH),
    sourceBlockIds: z.array(domainIdSchema),
  })
  .strict();

export const cvLayoutConfigSchema = z
  .object({
    templateKey: cvLayoutTemplateSchema,
    columns: z.union([z.literal(1), z.literal(2)]),
  })
  .strict();

export const cvPreviewInputSchema = z
  .object({
    userId: domainIdSchema,
    profileSnapshotId: domainIdSchema,
    translatedContent: translationOutputSchema,
    templateKey: cvLayoutTemplateSchema,
    selectedRouteId: domainIdSchema.optional(),
  })
  .strict();

export const cvPreviewOutputSchema = z
  .object({
    sections: z.array(cvSectionSchema).min(1),
    layout: cvLayoutConfigSchema,
    completeness: cvCompletenessStatusSchema,
    selectedRouteId: domainIdSchema.optional(),
  })
  .strict();

export type CvPreviewInput = z.infer<typeof cvPreviewInputSchema>;
export type CvPreviewModel = z.infer<typeof cvPreviewOutputSchema>;
export type CvLayoutTemplate = z.infer<typeof cvLayoutTemplateSchema>;
export type CvCompletenessStatus = z.infer<typeof cvCompletenessStatusSchema>;
