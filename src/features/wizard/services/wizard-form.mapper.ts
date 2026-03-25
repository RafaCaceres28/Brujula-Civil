import {
  competenciasStepSchema,
  experienciaStepSchema,
  militarStepSchema,
  objetivosStepSchema,
  onboardingDraftSchema,
  resumenStepSchema,
} from '../schemas/wizard.schema';
import type {
  CompetenciasStepPayload,
  ExperienciaStepPayload,
  MilitarStepPayload,
  ObjetivosStepPayload,
  OnboardingDraft,
  ResumenStepPayload,
} from '../types/wizard.types';
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

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function getNullableString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value.length > 0 ? value : null;
}

function getNullableNumber(formData: FormData, key: string) {
  const raw = getString(formData, key);
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTextareaList(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!value || typeof value !== 'string') {
    return [];
  }

  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

type CatalogResolver = {
  allowedValues: Set<string>;
  labelToValue: Map<string, string>;
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
    labelToValue: new Map(
      options.map((option) => [normalizeCatalogToken(option.label), option.value] as const),
    ),
  };
}

function resolveCatalogValue(rawValue: string, resolver: CatalogResolver): string | null {
  const normalizedRawValue = rawValue.trim();
  if (!normalizedRawValue) {
    return null;
  }

  if (resolver.allowedValues.has(normalizedRawValue)) {
    return normalizedRawValue;
  }

  return resolver.labelToValue.get(normalizeCatalogToken(normalizedRawValue)) ?? null;
}

function getFormValues(formData: FormData, key: string) {
  const directValues = formData
    .getAll(key)
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);

  if (directValues.length > 1) {
    return directValues;
  }

  if (directValues.length === 1) {
    return directValues[0]
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return getTextareaList(formData, key);
}

function getCatalogSingleValue(formData: FormData, key: string, resolver: CatalogResolver) {
  const value = getNullableString(formData, key);
  if (!value) {
    return null;
  }

  return resolveCatalogValue(value, resolver);
}

function getCatalogMultiValues(formData: FormData, key: string, resolver: CatalogResolver) {
  const values = getFormValues(formData, key);
  const uniqueValues = new Set<string>();

  for (const value of values) {
    const resolvedValue = resolveCatalogValue(value, resolver);
    if (resolvedValue) {
      uniqueValues.add(resolvedValue);
    }
  }

  return Array.from(uniqueValues);
}

function getOptionLabel(
  options: Array<{ value: string; label: string }>,
  value: string | null,
): string | null {
  if (!value) return null;
  return options.find((option) => option.value === value)?.label ?? null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

const EMPTY_DRAFT = onboardingDraftSchema.parse({});

export function getDraftDefaults(): OnboardingDraft {
  return EMPTY_DRAFT;
}

export function getMilitarStepDefaults(value: unknown): MilitarStepPayload {
  return militarStepSchema.parse({
    ...EMPTY_DRAFT.militar,
    ...(isObject(value) ? value : {}),
  });
}

export function getExperienciaStepDefaults(value: unknown): ExperienciaStepPayload {
  return experienciaStepSchema.parse({
    ...EMPTY_DRAFT.experiencia,
    ...(isObject(value) ? value : {}),
  });
}

export function getCompetenciasStepDefaults(value: unknown): CompetenciasStepPayload {
  return competenciasStepSchema.parse({
    ...EMPTY_DRAFT.competencias,
    ...(isObject(value) ? value : {}),
  });
}

export function getObjetivosStepDefaults(value: unknown): ObjetivosStepPayload {
  return objetivosStepSchema.parse({
    ...EMPTY_DRAFT.objetivos,
    ...(isObject(value) ? value : {}),
  });
}

export function getResumenStepDefaults(value: unknown): { confirmed: boolean } {
  return {
    confirmed: isObject(value) && typeof value.confirmed === 'boolean' ? value.confirmed : false,
  };
}

function getLanguageList(formData: FormData, key: string) {
  return getFormValues(formData, key)
    .map((item) => {
      const [rawName, rawLevel] = item
        .split(/[:|]/)
        .map((value) => value.trim())
        .filter(Boolean);

      const languageName = rawName ? resolveCatalogValue(rawName, LANGUAGE_RESOLVER) : null;
      if (!languageName) {
        return null;
      }

      const languageLevel = rawLevel
        ? resolveCatalogValue(rawLevel, LANGUAGE_LEVEL_RESOLVER)
        : 'intermediate';

      return {
        name: languageName,
        level: languageLevel ?? 'intermediate',
      };
    })
    .filter((item): item is { name: string; level: string } => item !== null);
}

function getTargetRoles(formData: FormData, key: string) {
  return getFormValues(formData, key)
    .map((item) => {
      const slug = item.trim();

      if (TARGET_ROLE_BY_SLUG.has(slug)) {
        return {
          slug,
          label: TARGET_ROLE_BY_SLUG.get(slug) ?? item,
        };
      }

      const byLabel = TARGET_ROLE_BY_LABEL.get(normalizeCatalogToken(item));
      if (byLabel) {
        return {
          slug: byLabel.slug,
          label: byLabel.label,
        };
      }

      return null;
    })
    .filter((item): item is { slug: string; label: string } => item !== null);
}

export function parseMilitarFormData(formData: FormData): MilitarStepPayload {
  const branch = getCatalogSingleValue(formData, 'branch', BRANCH_RESOLVER);
  const corps = getCatalogSingleValue(formData, 'corps', CORPS_RESOLVER);
  const rankCode = getCatalogSingleValue(formData, 'rankCode', RANK_RESOLVER);
  const specialtyCode = getCatalogSingleValue(formData, 'specialtyCode', SPECIALTY_RESOLVER);

  return militarStepSchema.parse({
    branch,
    corps,
    rank: {
      code: rankCode,
      label: getOptionLabel(RANK_OPTIONS, rankCode),
    },
    specialty: {
      code: specialtyCode,
      label: getOptionLabel(SPECIALTY_OPTIONS, specialtyCode),
    },
    serviceYears: getNullableNumber(formData, 'serviceYears'),
    destinationContext: getCatalogSingleValue(
      formData,
      'destinationContext',
      DESTINATION_CONTEXT_RESOLVER,
    ),
    leadershipLevel: getCatalogSingleValue(formData, 'leadershipLevel', LEADERSHIP_LEVEL_RESOLVER),
    teamSize: getCatalogSingleValue(formData, 'teamSize', TEAM_SIZE_RESOLVER),
    unitName: getNullableString(formData, 'unitName'),
    notes: getNullableString(formData, 'notes'),
  });
}

export function parseExperienciaFormData(formData: FormData): ExperienciaStepPayload {
  return experienciaStepSchema.parse({
    responsibilityAreas: getCatalogMultiValues(
      formData,
      'responsibilityAreas',
      RESPONSIBILITY_AREA_RESOLVER,
    ),
    missionTypes: getCatalogMultiValues(formData, 'missionTypes', MISSION_TYPE_RESOLVER),
    functionTypes: getCatalogMultiValues(formData, 'functionTypes', FUNCTION_TYPE_RESOLVER),
    achievements: getTextareaList(formData, 'achievements'),
    tools: getCatalogMultiValues(formData, 'tools', TOOL_RESOLVER),
    leadershipScopes: getCatalogMultiValues(
      formData,
      'leadershipScopes',
      LEADERSHIP_SCOPE_RESOLVER,
    ),
    additionalContext: getNullableString(formData, 'additionalContext'),
  });
}

export function parseCompetenciasFormData(formData: FormData): CompetenciasStepPayload {
  return competenciasStepSchema.parse({
    technicalSkills: getCatalogMultiValues(formData, 'technicalSkills', TECHNICAL_SKILL_RESOLVER),
    softSkills: getCatalogMultiValues(formData, 'softSkills', SOFT_SKILL_RESOLVER),
    certifications: getCatalogMultiValues(formData, 'certifications', CERTIFICATION_RESOLVER),
    drivingLicenses: getCatalogMultiValues(formData, 'drivingLicenses', DRIVING_LICENSE_RESOLVER),
    languages: getLanguageList(formData, 'languages'),
    officeTools: getCatalogMultiValues(formData, 'officeTools', OFFICE_TOOL_RESOLVER),
    extraTraining: getNullableString(formData, 'extraTraining'),
  });
}

export function parseObjetivosFormData(formData: FormData): ObjetivosStepPayload {
  return objetivosStepSchema.parse({
    targetRoles: getTargetRoles(formData, 'targetRoles'),
    targetSectors: getCatalogMultiValues(formData, 'targetSectors', TARGET_SECTOR_RESOLVER),
    preferredLocations: getCatalogMultiValues(formData, 'preferredLocations', LOCATION_RESOLVER),
    workModel: getCatalogSingleValue(formData, 'workModel', WORK_MODEL_RESOLVER),
    seniority: getCatalogSingleValue(formData, 'seniority', SENIORITY_RESOLVER),
    preferencesNotes: getNullableString(formData, 'preferencesNotes'),
  });
}

export function parseResumenFormData(formData: FormData): ResumenStepPayload {
  return resumenStepSchema.parse({
    confirmed: formData.get('confirmed') === 'on' || formData.get('confirmed') === 'true',
  });
}
