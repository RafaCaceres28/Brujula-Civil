import { z } from 'zod';
import {
  BRANCH_OPTIONS,
  CERTIFICATION_OPTIONS,
  CORPS_OPTIONS,
  DESTINATION_CONTEXT_OPTIONS,
  DRIVING_LICENSE_OPTIONS,
  FUNCTION_TYPE_OPTIONS,
  LANGUAGE_LEVEL_OPTIONS,
  LANGUAGE_OPTIONS,
  LEADERSHIP_LEVEL_OPTIONS,
  LEADERSHIP_SCOPE_OPTIONS,
  LOCATION_OPTIONS,
  MISSION_TYPE_OPTIONS,
  OFFICE_TOOL_OPTIONS,
  RANK_OPTIONS,
  RESPONSIBILITY_AREA_OPTIONS,
  SENIORITY_OPTIONS,
  SOFT_SKILL_OPTIONS,
  SPECIALTY_OPTIONS,
  TARGET_ROLE_OPTIONS,
  TARGET_SECTOR_OPTIONS,
  TEAM_SIZE_OPTIONS,
  TECHNICAL_SKILL_OPTIONS,
  TOOL_OPTIONS,
  WORK_MODEL_OPTIONS,
  type CatalogOption,
} from '../config/wizard-catalogs';

const optionalShortText = z.string().trim().max(160, 'Máximo 160 caracteres').nullable();

const optionalLongText = z.string().trim().max(500, 'Máximo 500 caracteres').nullable();

function createCatalogValueSchema(options: CatalogOption[]) {
  const allowedValues = new Set(options.map((option) => option.value));

  return z
    .string()
    .trim()
    .min(1)
    .refine((value) => allowedValues.has(value), 'Selecciona un valor válido del catálogo');
}

function createCatalogSingleNullableSchema(options: CatalogOption[]) {
  const valueSchema = createCatalogValueSchema(options);

  return z
    .string()
    .trim()
    .nullable()
    .superRefine((value, context) => {
      if (value === null) {
        return;
      }

      const parsed = valueSchema.safeParse(value);
      if (!parsed.success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecciona un valor válido del catálogo',
        });
      }
    });
}

function createCatalogMultiSchema(options: CatalogOption[]) {
  return z.array(createCatalogValueSchema(options)).default([]);
}

const branchSchema = createCatalogSingleNullableSchema(BRANCH_OPTIONS);
const corpsSchema = createCatalogSingleNullableSchema(CORPS_OPTIONS);
const destinationContextSchema = createCatalogSingleNullableSchema(DESTINATION_CONTEXT_OPTIONS);
const leadershipLevelSchema = createCatalogSingleNullableSchema(LEADERSHIP_LEVEL_OPTIONS);
const teamSizeSchema = createCatalogSingleNullableSchema(TEAM_SIZE_OPTIONS);
const responsibilityAreasSchema = createCatalogMultiSchema(RESPONSIBILITY_AREA_OPTIONS);
const missionTypesSchema = createCatalogMultiSchema(MISSION_TYPE_OPTIONS);
const functionTypesSchema = createCatalogMultiSchema(FUNCTION_TYPE_OPTIONS);
const toolsSchema = createCatalogMultiSchema(TOOL_OPTIONS);
const leadershipScopesSchema = createCatalogMultiSchema(LEADERSHIP_SCOPE_OPTIONS);
const technicalSkillsSchema = createCatalogMultiSchema(TECHNICAL_SKILL_OPTIONS);
const softSkillsSchema = createCatalogMultiSchema(SOFT_SKILL_OPTIONS);
const certificationsSchema = createCatalogMultiSchema(CERTIFICATION_OPTIONS);
const drivingLicensesSchema = createCatalogMultiSchema(DRIVING_LICENSE_OPTIONS);
const officeToolsSchema = createCatalogMultiSchema(OFFICE_TOOL_OPTIONS);
const targetSectorsSchema = createCatalogMultiSchema(TARGET_SECTOR_OPTIONS);
const preferredLocationsSchema = createCatalogMultiSchema(LOCATION_OPTIONS);
const workModelSchema = createCatalogSingleNullableSchema(WORK_MODEL_OPTIONS);
const senioritySchema = createCatalogSingleNullableSchema(SENIORITY_OPTIONS);

const targetRoleSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .refine(
      (slug) => TARGET_ROLE_OPTIONS.some((option) => option.slug === slug),
      'Selecciona un rol objetivo válido del catálogo',
    ),
  label: z.string().trim().min(1),
});

const languageItemSchema = z.object({
  name: createCatalogValueSchema(LANGUAGE_OPTIONS),
  level: createCatalogValueSchema(LANGUAGE_LEVEL_OPTIONS),
});

const rankSchema = z.object({
  code: createCatalogSingleNullableSchema(RANK_OPTIONS),
  label: z.string().trim().nullable(),
});

const specialtySchema = z.object({
  code: createCatalogSingleNullableSchema(SPECIALTY_OPTIONS),
  label: z.string().trim().nullable(),
});

export const militarStepSchema = z.object({
  branch: branchSchema,
  corps: corpsSchema,
  rank: rankSchema,
  specialty: specialtySchema,
  serviceYears: z.number().int().min(0).max(60).nullable(),
  destinationContext: destinationContextSchema,
  leadershipLevel: leadershipLevelSchema,
  teamSize: teamSizeSchema,
  unitName: optionalShortText,
  notes: optionalLongText,
});

export const experienciaStepSchema = z.object({
  responsibilityAreas: responsibilityAreasSchema,
  missionTypes: missionTypesSchema,
  functionTypes: functionTypesSchema,
  tools: toolsSchema,
  leadershipScopes: leadershipScopesSchema,
  achievements: z.array(z.string().trim().min(1).max(180)).max(5).default([]),
  additionalContext: optionalLongText,
});

export const competenciasStepSchema = z.object({
  technicalSkills: technicalSkillsSchema,
  softSkills: softSkillsSchema,
  certifications: certificationsSchema,
  drivingLicenses: drivingLicensesSchema,
  languages: z.array(languageItemSchema).max(5).default([]),
  officeTools: officeToolsSchema,
  extraTraining: optionalLongText,
});

export const objetivosStepSchema = z.object({
  targetRoles: z.array(targetRoleSchema).max(5).default([]),
  targetSectors: targetSectorsSchema,
  preferredLocations: preferredLocationsSchema,
  workModel: workModelSchema,
  seniority: senioritySchema,
  preferencesNotes: optionalLongText,
});

export const resumenStepSchema = z.object({
  confirmed: z.literal(true),
});

export const onboardingDraftSchema = z.object({
  militar: militarStepSchema.default({
    branch: null,
    corps: null,
    rank: {
      code: null,
      label: null,
    },
    specialty: {
      code: null,
      label: null,
    },
    serviceYears: null,
    destinationContext: null,
    leadershipLevel: null,
    teamSize: null,
    unitName: null,
    notes: null,
  }),
  experiencia: experienciaStepSchema.default({
    responsibilityAreas: [],
    missionTypes: [],
    functionTypes: [],
    tools: [],
    leadershipScopes: [],
    achievements: [],
    additionalContext: null,
  }),
  competencias: competenciasStepSchema.default({
    technicalSkills: [],
    softSkills: [],
    certifications: [],
    drivingLicenses: [],
    languages: [],
    officeTools: [],
    extraTraining: null,
  }),
  objetivos: objetivosStepSchema.default({
    targetRoles: [],
    targetSectors: [],
    preferredLocations: [],
    workModel: null,
    seniority: null,
    preferencesNotes: null,
  }),
  resumen: z
    .object({
      confirmed: z.boolean().default(false),
    })
    .default({
      confirmed: false,
    }),
});

export type TargetRoleSchema = z.infer<typeof targetRoleSchema>;
export type LanguageItemSchema = z.infer<typeof languageItemSchema>;
export type CompetenciasStep = z.infer<typeof competenciasStepSchema>;
