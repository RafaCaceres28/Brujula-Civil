import { z } from 'zod';
import { domainIdSchema, localeSchema } from '../../../lib/contracts/shared.schema';

const MAX_TEXT_BLOCK_LENGTH = 1500;
const MAX_SUMMARY_LENGTH = 500;
const MAX_LABEL_LENGTH = 160;

const nullableTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    }

    return value;
  }, z.string().trim().max(maxLength).nullable());

const textListSchema = z.array(z.string().trim().min(1).max(MAX_TEXT_BLOCK_LENGTH)).min(1);

export const translationToneSchema = z.enum(['formal', 'neutral', 'concise']);

export const profileSnapshotSchema = z
  .object({
    kind: z.literal('profile_snapshot'),
    snapshotId: domainIdSchema,
    summary: nullableTrimmedString(MAX_SUMMARY_LENGTH),
    highlights: textListSchema,
  })
  .strict();

export const linkedInNormalizedProfileSchema = z
  .object({
    kind: z.literal('linkedin_normalized_profile'),
    profileId: domainIdSchema,
    headline: z.string().trim().min(1).max(MAX_LABEL_LENGTH),
    highlights: textListSchema,
  })
  .strict();

export const translationSourceProfileSchema = z.discriminatedUnion('kind', [
  profileSnapshotSchema,
  linkedInNormalizedProfileSchema,
]);

export const translationInputSchema = z
  .object({
    userId: domainIdSchema,
    sourceProfile: translationSourceProfileSchema,
    sourceLanguage: localeSchema,
    targetLanguage: localeSchema,
    tone: translationToneSchema.optional(),
  })
  .strict();

export const translatedBlockSchema = z
  .object({
    id: domainIdSchema,
    content: z.string().trim().min(1).max(MAX_TEXT_BLOCK_LENGTH),
    sourceRef: domainIdSchema,
  })
  .strict();

export const translationQualityFlagSchema = z.enum([
  'LOW_CONFIDENCE',
  'MISSING_CONTEXT',
  'TERMINOLOGY_REVIEW',
]);

export const translationOutputSchema = z
  .object({
    blocks: z.array(translatedBlockSchema).min(1),
    sourceRefMap: z.record(domainIdSchema, domainIdSchema),
    qualityFlags: z.array(translationQualityFlagSchema),
  })
  .strict();

export type TranslationInput = z.infer<typeof translationInputSchema>;
export type TranslationOutput = z.infer<typeof translationOutputSchema>;
export type TranslationTone = z.infer<typeof translationToneSchema>;
export type ProfileSnapshot = z.infer<typeof profileSnapshotSchema>;
export type LinkedInNormalizedProfile = z.infer<typeof linkedInNormalizedProfileSchema>;
export type TranslationSourceProfile = z.infer<typeof translationSourceProfileSchema>;
export type TranslatedBlock = z.infer<typeof translatedBlockSchema>;
export type TranslationQualityFlag = z.infer<typeof translationQualityFlagSchema>;
