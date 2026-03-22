import { z } from 'zod';

// Constants copied from profile.schema.ts to maintain consistency
const MAX_NAME_LENGTH = 120;
const MAX_SUMMARY_LENGTH = 500;

const nullableTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      return trimmedValue === '' ? null : trimmedValue;
    }

    return value;
  }, z.string().trim().max(maxLength).nullable());

const requiredTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) {
      return undefined; // Return undefined to trigger Zod's required field validation
    }

    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      return trimmedValue === '' ? undefined : trimmedValue; // Empty string becomes undefined for required fields
    }

    return value;
  }, z.string().trim().max(maxLength)); // No nullable() - field is required

const nullableTrimmedStringWithDefault = (maxLength: number) =>
  nullableTrimmedString(maxLength).default(null);

// Input schema for translation function
export const translationInputSchema = z
  .object({
    militaryProfile: z
      .object({
        rank: requiredTrimmedString(MAX_NAME_LENGTH), // Required
        area: requiredTrimmedString(MAX_NAME_LENGTH), // Required
        yearsOfService: z.number().int().min(0).max(60).nullable(), // Required nullable
        summary: nullableTrimmedStringWithDefault(MAX_SUMMARY_LENGTH), // Optional
      })
      .strict(),
    civilianTarget: z
      .object({
        targetRole: requiredTrimmedString(MAX_NAME_LENGTH), // Required
        targetSector: requiredTrimmedString(MAX_NAME_LENGTH), // Required
        locationPreference: requiredTrimmedString(MAX_NAME_LENGTH), // Required
      })
      .strict(),
  })
  .strict();

// Output schema for translation function
export const translationOutputSchema = z
  .object({
    professionalSummary: z.string().trim().min(1).max(MAX_SUMMARY_LENGTH),
    transferableSkills: z.array(z.string().trim().min(1)).min(1),
    suggestedRoles: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

// Exported types for TypeScript usage
export type TranslationInput = z.infer<typeof translationInputSchema>;
export type TranslationOutput = z.infer<typeof translationOutputSchema>;
