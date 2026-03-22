import { z } from 'zod';

const optionalShortText = z.string().trim().max(160, 'Máximo 160 caracteres').nullable();

const optionalLongText = z.string().trim().max(500, 'Máximo 500 caracteres').nullable();

const stringArraySchema = z.array(z.string().trim().min(1)).default([]);

const targetRoleSchema = z.object({
  slug: z.string().trim().min(1),
  label: z.string().trim().min(1),
});

const languageItemSchema = z.object({
  name: z.string().trim().min(1),
  level: z.string().trim().min(1),
});

const rankSchema = z.object({
  code: z.string().trim().nullable(),
  label: z.string().trim().nullable(),
});

const specialtySchema = z.object({
  code: z.string().trim().nullable(),
  label: z.string().trim().nullable(),
});

export const militarStepSchema = z.object({
  branch: z.string().trim().nullable(),
  corps: z.string().trim().nullable(),
  rank: rankSchema,
  specialty: specialtySchema,
  serviceYears: z.number().int().min(0).max(60).nullable(),
  destinationContext: z.string().trim().nullable(),
  leadershipLevel: z.string().trim().nullable(),
  teamSize: z.string().trim().nullable(),
  unitName: optionalShortText,
  notes: optionalLongText,
});

export const experienciaStepSchema = z.object({
  responsibilityAreas: stringArraySchema,
  missionTypes: stringArraySchema,
  functionTypes: stringArraySchema,
  tools: stringArraySchema,
  leadershipScopes: stringArraySchema,
  achievements: z.array(z.string().trim().min(1).max(180)).max(5).default([]),
  additionalContext: optionalLongText,
});

export const competenciasStepSchema = z.object({
  technicalSkills: stringArraySchema,
  softSkills: stringArraySchema,
  certifications: stringArraySchema,
  drivingLicenses: stringArraySchema,
  languages: z.array(languageItemSchema).max(5).default([]),
  officeTools: stringArraySchema,
  extraTraining: optionalLongText,
});

export const objetivosStepSchema = z.object({
  targetRoles: z.array(targetRoleSchema).max(5).default([]),
  targetSectors: stringArraySchema,
  preferredLocations: stringArraySchema,
  workModel: z.enum(['onsite', 'hybrid', 'remote']).nullable(),
  seniority: z.enum(['junior', 'mid', 'senior', 'manager']).nullable(),
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
