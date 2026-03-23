import { z } from 'zod';
import { domainIdSchema } from '../../../lib/contracts/index';

const MAX_HEADLINE_LENGTH = 220;
const MAX_TEXT_LENGTH = 1200;
const MAX_LABEL_LENGTH = 160;
const MAX_SKILL_LENGTH = 80;

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

const optionalTrimmedUrl = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }

  return value;
}, z.string().url().optional());

export const linkedInSourceInputSchema = z
  .object({
    userId: domainIdSchema,
    profileUrl: optionalTrimmedUrl,
    rawProfilePayload: z.unknown().optional(),
  })
  .strict();

export const linkedInExperienceItemSchema = z
  .object({
    role: z.string().trim().min(1).max(MAX_LABEL_LENGTH),
    company: z.string().trim().min(1).max(MAX_LABEL_LENGTH),
    summary: nullableTrimmedString(MAX_TEXT_LENGTH),
  })
  .strict();

export const linkedInEducationItemSchema = z
  .object({
    institution: z.string().trim().min(1).max(MAX_LABEL_LENGTH),
    degree: nullableTrimmedString(MAX_LABEL_LENGTH),
    fieldOfStudy: nullableTrimmedString(MAX_LABEL_LENGTH),
  })
  .strict();

export const linkedInNormalizedProfileSchema = z
  .object({
    headline: nullableTrimmedString(MAX_HEADLINE_LENGTH),
    experience: z.array(linkedInExperienceItemSchema),
    education: z.array(linkedInEducationItemSchema),
    skills: z.array(z.string().trim().min(1).max(MAX_SKILL_LENGTH)),
  })
  .strict();

export type LinkedInSourceInput = z.infer<typeof linkedInSourceInputSchema>;
export type LinkedInExperienceItem = z.infer<typeof linkedInExperienceItemSchema>;
export type LinkedInEducationItem = z.infer<typeof linkedInEducationItemSchema>;
export type LinkedInNormalizedProfile = z.infer<typeof linkedInNormalizedProfileSchema>;
