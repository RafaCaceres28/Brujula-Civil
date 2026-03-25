import { z } from 'zod';
import { domainIdSchema, timestampSchema } from '../../../lib/contracts/index';
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
import { onboardingDraftSchema } from './wizard.schema';
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
  selectedRouteContextSchema,
} from '../../recommendations/schemas/recommendation.schema';

const sourceRefMapSchema = z.record(domainIdSchema, domainIdSchema);
const EMPTY_ONBOARDING_DRAFT = onboardingDraftSchema.parse({});

type CatalogResolver = {
  allowedValues: Set<string>;
  normalizedLabelToValue: Map<string, string>;
};

function normalizeCatalogToken(value: string) {
  return value
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

function createCatalogResolver(options: CatalogOption[]): CatalogResolver {
  return {
    allowedValues: new Set(options.map((option) => option.value)),
    normalizedLabelToValue: new Map(
      options.map((option) => [normalizeCatalogToken(option.label), option.value] as const),
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function getOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function resolveCatalogValue(value: unknown, resolver: CatalogResolver): string | null {
  const normalizedValue = getNullableString(value);
  if (!normalizedValue) {
    return null;
  }

  if (resolver.allowedValues.has(normalizedValue)) {
    return normalizedValue;
  }

  return resolver.normalizedLabelToValue.get(normalizeCatalogToken(normalizedValue)) ?? null;
}

function getCatalogValues(value: unknown, resolver: CatalogResolver): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueValues = new Set<string>();

  for (const item of value) {
    const resolved = resolveCatalogValue(item, resolver);
    if (resolved) {
      uniqueValues.add(resolved);
    }
  }

  return Array.from(uniqueValues);
}

const BRANCH_RESOLVER = createCatalogResolver(BRANCH_OPTIONS);
const CORPS_RESOLVER = createCatalogResolver(CORPS_OPTIONS);
const RANK_RESOLVER = createCatalogResolver(RANK_OPTIONS);
const SPECIALTY_RESOLVER = createCatalogResolver(SPECIALTY_OPTIONS);
const DESTINATION_CONTEXT_RESOLVER = createCatalogResolver(DESTINATION_CONTEXT_OPTIONS);
const LEADERSHIP_LEVEL_RESOLVER = createCatalogResolver(LEADERSHIP_LEVEL_OPTIONS);
const TEAM_SIZE_RESOLVER = createCatalogResolver(TEAM_SIZE_OPTIONS);
const RESPONSIBILITY_AREA_RESOLVER = createCatalogResolver(RESPONSIBILITY_AREA_OPTIONS);
const MISSION_TYPE_RESOLVER = createCatalogResolver(MISSION_TYPE_OPTIONS);
const FUNCTION_TYPE_RESOLVER = createCatalogResolver(FUNCTION_TYPE_OPTIONS);
const TOOL_RESOLVER = createCatalogResolver(TOOL_OPTIONS);
const LEADERSHIP_SCOPE_RESOLVER = createCatalogResolver(LEADERSHIP_SCOPE_OPTIONS);
const TECHNICAL_SKILL_RESOLVER = createCatalogResolver(TECHNICAL_SKILL_OPTIONS);
const SOFT_SKILL_RESOLVER = createCatalogResolver(SOFT_SKILL_OPTIONS);
const CERTIFICATION_RESOLVER = createCatalogResolver(CERTIFICATION_OPTIONS);
const DRIVING_LICENSE_RESOLVER = createCatalogResolver(DRIVING_LICENSE_OPTIONS);
const LANGUAGE_RESOLVER = createCatalogResolver(LANGUAGE_OPTIONS);
const LANGUAGE_LEVEL_RESOLVER = createCatalogResolver(LANGUAGE_LEVEL_OPTIONS);
const OFFICE_TOOL_RESOLVER = createCatalogResolver(OFFICE_TOOL_OPTIONS);
const TARGET_SECTOR_RESOLVER = createCatalogResolver(TARGET_SECTOR_OPTIONS);
const LOCATION_RESOLVER = createCatalogResolver(LOCATION_OPTIONS);
const WORK_MODEL_RESOLVER = createCatalogResolver(WORK_MODEL_OPTIONS);
const SENIORITY_RESOLVER = createCatalogResolver(SENIORITY_OPTIONS);

const TARGET_ROLE_BY_SLUG = new Map(
  TARGET_ROLE_OPTIONS.map((option) => [option.slug, option.label] as const),
);
const TARGET_ROLE_BY_LABEL = new Map(
  TARGET_ROLE_OPTIONS.map((option) => [normalizeCatalogToken(option.label), option] as const),
);

function sanitizeOnboardingDraft(input: unknown) {
  if (!isRecord(input)) {
    return EMPTY_ONBOARDING_DRAFT;
  }

  const militar = isRecord(input.militar) ? input.militar : {};
  const experiencia = isRecord(input.experiencia) ? input.experiencia : {};
  const competencias = isRecord(input.competencias) ? input.competencias : {};
  const objetivos = isRecord(input.objetivos) ? input.objetivos : {};
  const resumen = isRecord(input.resumen) ? input.resumen : {};

  const rank = isRecord(militar.rank) ? militar.rank : {};
  const specialty = isRecord(militar.specialty) ? militar.specialty : {};

  return {
    ...EMPTY_ONBOARDING_DRAFT,
    militar: {
      ...EMPTY_ONBOARDING_DRAFT.militar,
      branch: resolveCatalogValue(militar.branch, BRANCH_RESOLVER),
      corps: resolveCatalogValue(militar.corps, CORPS_RESOLVER),
      rank: {
        code: resolveCatalogValue(rank.code, RANK_RESOLVER),
        label: getNullableString(rank.label),
      },
      specialty: {
        code: resolveCatalogValue(specialty.code, SPECIALTY_RESOLVER),
        label: getNullableString(specialty.label),
      },
      serviceYears:
        typeof militar.serviceYears === 'number' && Number.isFinite(militar.serviceYears)
          ? militar.serviceYears
          : null,
      destinationContext: resolveCatalogValue(
        militar.destinationContext,
        DESTINATION_CONTEXT_RESOLVER,
      ),
      leadershipLevel: resolveCatalogValue(militar.leadershipLevel, LEADERSHIP_LEVEL_RESOLVER),
      teamSize: resolveCatalogValue(militar.teamSize, TEAM_SIZE_RESOLVER),
      unitName: getNullableString(militar.unitName),
      notes: getNullableString(militar.notes),
    },
    experiencia: {
      ...EMPTY_ONBOARDING_DRAFT.experiencia,
      responsibilityAreas: getCatalogValues(
        experiencia.responsibilityAreas,
        RESPONSIBILITY_AREA_RESOLVER,
      ),
      missionTypes: getCatalogValues(experiencia.missionTypes, MISSION_TYPE_RESOLVER),
      functionTypes: getCatalogValues(experiencia.functionTypes, FUNCTION_TYPE_RESOLVER),
      tools: getCatalogValues(experiencia.tools, TOOL_RESOLVER),
      leadershipScopes: getCatalogValues(experiencia.leadershipScopes, LEADERSHIP_SCOPE_RESOLVER),
      achievements: Array.isArray(experiencia.achievements)
        ? experiencia.achievements
            .map((item) => getOptionalString(item))
            .filter((item): item is string => item !== undefined)
        : [],
      additionalContext: getNullableString(experiencia.additionalContext),
    },
    competencias: {
      ...EMPTY_ONBOARDING_DRAFT.competencias,
      technicalSkills: getCatalogValues(competencias.technicalSkills, TECHNICAL_SKILL_RESOLVER),
      softSkills: getCatalogValues(competencias.softSkills, SOFT_SKILL_RESOLVER),
      certifications: getCatalogValues(competencias.certifications, CERTIFICATION_RESOLVER),
      drivingLicenses: getCatalogValues(competencias.drivingLicenses, DRIVING_LICENSE_RESOLVER),
      languages: Array.isArray(competencias.languages)
        ? competencias.languages
            .map((item) => {
              if (!isRecord(item)) {
                return null;
              }

              const name = resolveCatalogValue(item.name, LANGUAGE_RESOLVER);
              if (!name) {
                return null;
              }

              const level =
                resolveCatalogValue(item.level, LANGUAGE_LEVEL_RESOLVER) ?? 'intermediate';

              return { name, level };
            })
            .filter((item): item is { name: string; level: string } => item !== null)
        : [],
      officeTools: getCatalogValues(competencias.officeTools, OFFICE_TOOL_RESOLVER),
      extraTraining: getNullableString(competencias.extraTraining),
    },
    objetivos: {
      ...EMPTY_ONBOARDING_DRAFT.objetivos,
      targetRoles: Array.isArray(objetivos.targetRoles)
        ? objetivos.targetRoles
            .map((item) => {
              if (isRecord(item)) {
                const slug = getOptionalString(item.slug);

                if (slug && TARGET_ROLE_BY_SLUG.has(slug)) {
                  return {
                    slug,
                    label: TARGET_ROLE_BY_SLUG.get(slug) ?? getOptionalString(item.label) ?? slug,
                  };
                }

                const byLabel = getOptionalString(item.label)
                  ? TARGET_ROLE_BY_LABEL.get(normalizeCatalogToken(String(item.label)))
                  : undefined;

                if (byLabel) {
                  return {
                    slug: byLabel.slug,
                    label: byLabel.label,
                  };
                }

                return null;
              }

              const rawItem = getOptionalString(item);
              if (!rawItem) {
                return null;
              }

              if (TARGET_ROLE_BY_SLUG.has(rawItem)) {
                return {
                  slug: rawItem,
                  label: TARGET_ROLE_BY_SLUG.get(rawItem) ?? rawItem,
                };
              }

              const byLabel = TARGET_ROLE_BY_LABEL.get(normalizeCatalogToken(rawItem));
              if (byLabel) {
                return {
                  slug: byLabel.slug,
                  label: byLabel.label,
                };
              }

              return null;
            })
            .filter((item): item is { slug: string; label: string } => item !== null)
        : [],
      targetSectors: getCatalogValues(objetivos.targetSectors, TARGET_SECTOR_RESOLVER),
      preferredLocations: getCatalogValues(objetivos.preferredLocations, LOCATION_RESOLVER),
      workModel: resolveCatalogValue(objetivos.workModel, WORK_MODEL_RESOLVER),
      seniority: resolveCatalogValue(objetivos.seniority, SENIORITY_RESOLVER),
      preferencesNotes: getNullableString(objetivos.preferencesNotes),
    },
    resumen: {
      confirmed: resumen.confirmed === true,
    },
  };
}

export const onboardingDraftStateSchema = z.preprocess(
  sanitizeOnboardingDraft,
  onboardingDraftSchema,
);

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
    selectedRouteId: domainIdSchema.optional(),
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
    selectedRouteContext: selectedRouteContextSchema.optional(),
    selectedRecommendation: recommendationSelectionSchema.optional(),
    cvPreviewDraft: cvPreviewDraftSchema.optional(),
    lastUpdatedAt: timestampSchema.optional(),
    lastOnboardingStep: z.string().trim().min(1).max(64).optional(),
  })
  .passthrough();
