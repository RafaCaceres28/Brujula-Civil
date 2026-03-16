import { z } from 'zod';

const MAX_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 16;
const MAX_CITY_LENGTH = 120;
const MAX_SUMMARY_LENGTH = 500;
const E164_PHONE_PATTERN = /^\+[1-9]\d{1,14}$/;

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

const nullableTrimmedStringWithDefault = (maxLength: number) =>
  nullableTrimmedString(maxLength).default(null);

export const fullNameFieldSchema = z.string().trim().min(1).max(MAX_NAME_LENGTH);

export const emailFieldSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(MAX_NAME_LENGTH * 2);

export const phoneFieldSchema = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    return trimmedValue === '' ? null : trimmedValue;
  }

  return value;
}, z.string().trim().max(MAX_PHONE_LENGTH).regex(E164_PHONE_PATTERN).nullable());

export const cityFieldSchema = nullableTrimmedString(MAX_CITY_LENGTH);

export const profileFormValuesSchema = z.object({
  fullName: fullNameFieldSchema,
  email: emailFieldSchema,
  phone: phoneFieldSchema.default(null),
  city: cityFieldSchema.default(null),
});

export const militaryBackgroundSchema = z
  .object({
    rank: nullableTrimmedStringWithDefault(MAX_NAME_LENGTH),
    area: nullableTrimmedStringWithDefault(MAX_NAME_LENGTH),
    yearsOfService: z.number().int().min(0).max(60).nullable().default(null),
    summary: nullableTrimmedStringWithDefault(MAX_SUMMARY_LENGTH),
  })
  .default({
    rank: null,
    area: null,
    yearsOfService: null,
    summary: null,
  });

export const civilianTargetSchema = z
  .object({
    targetRole: nullableTrimmedStringWithDefault(MAX_NAME_LENGTH),
    targetSector: nullableTrimmedStringWithDefault(MAX_NAME_LENGTH),
    locationPreference: nullableTrimmedStringWithDefault(MAX_NAME_LENGTH),
  })
  .default({
    targetRole: null,
    targetSector: null,
    locationPreference: null,
  });

const profileInputBaseSchema = z.object({
  userId: z.string().trim().min(1),
  profile: profileFormValuesSchema,
  militaryBackground: militaryBackgroundSchema,
  civilianTarget: civilianTargetSchema,
});

export const saveDraftInputSchema = profileInputBaseSchema;

export const submitProfileInputSchema = profileInputBaseSchema.superRefine((value, ctx) => {
  if (!value.militaryBackground.rank) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'militaryBackground.rank is required for submit',
      path: ['militaryBackground', 'rank'],
    });
  }

  if (!value.militaryBackground.area) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'militaryBackground.area is required for submit',
      path: ['militaryBackground', 'area'],
    });
  }

  if (!value.civilianTarget.targetRole) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'civilianTarget.targetRole is required for submit',
      path: ['civilianTarget', 'targetRole'],
    });
  }

  if (!value.civilianTarget.targetSector) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'civilianTarget.targetSector is required for submit',
      path: ['civilianTarget', 'targetSector'],
    });
  }
});

export const saveProfileInputSchema = saveDraftInputSchema;

export const profileReadOutputSchema = z.object({
  userId: z.string().trim().min(1),
  profile: profileFormValuesSchema,
  militaryBackground: militaryBackgroundSchema,
  civilianTarget: civilianTargetSchema,
});

export type ProfileFormValuesSchemaInput = z.infer<typeof profileFormValuesSchema>;
export type MilitaryBackgroundSchemaInput = z.infer<typeof militaryBackgroundSchema>;
export type CivilianTargetSchemaInput = z.infer<typeof civilianTargetSchema>;
export type SaveDraftInputSchemaInput = z.infer<typeof saveDraftInputSchema>;
export type SubmitProfileInputSchemaInput = z.infer<typeof submitProfileInputSchema>;
export type SaveProfileInputSchemaInput = z.infer<typeof saveProfileInputSchema>;
export type ProfileReadOutputSchemaInput = z.infer<typeof profileReadOutputSchema>;
