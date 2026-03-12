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

import { RANK_OPTIONS, SPECIALTY_OPTIONS } from '../config/wizard-catalogs';

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

function toSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getLanguageList(formData: FormData, key: string) {
  return getTextareaList(formData, key).map((item) => {
    const [namePart, levelPart] = item.split(':').map((value) => value.trim());

    return {
      name: namePart,
      level: levelPart || 'intermediate',
    };
  });
}

function getTargetRoles(formData: FormData, key: string) {
  return getTextareaList(formData, key).map((label) => ({
    slug: toSlug(label),
    label,
  }));
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

export function parseMilitarFormData(formData: FormData): MilitarStepPayload {
  const branch = getNullableString(formData, 'branch');
  const corps = getNullableString(formData, 'corps');
  const rankCode = getNullableString(formData, 'rankCode');
  const specialtyCode = getNullableString(formData, 'specialtyCode');

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
    destinationContext: getNullableString(formData, 'destinationContext'),
    leadershipLevel: getNullableString(formData, 'leadershipLevel'),
    teamSize: getNullableString(formData, 'teamSize'),
    unitName: getNullableString(formData, 'unitName'),
    notes: getNullableString(formData, 'notes'),
  });
}

export function parseExperienciaFormData(formData: FormData): ExperienciaStepPayload {
  return experienciaStepSchema.parse({
    responsibilityAreas: getTextareaList(formData, 'responsibilityAreas'),
    missionTypes: getTextareaList(formData, 'missionTypes'),
    functionTypes: getTextareaList(formData, 'functionTypes'),
    achievements: getTextareaList(formData, 'achievements'),
    tools: getTextareaList(formData, 'tools'),
    leadershipScopes: getTextareaList(formData, 'leadershipScopes'),
    additionalContext: getNullableString(formData, 'additionalContext'),
  });
}

export function parseCompetenciasFormData(formData: FormData): CompetenciasStepPayload {
  return competenciasStepSchema.parse({
    technicalSkills: getTextareaList(formData, 'technicalSkills'),
    softSkills: getTextareaList(formData, 'softSkills'),
    certifications: getTextareaList(formData, 'certifications'),
    drivingLicenses: getTextareaList(formData, 'drivingLicenses'),
    languages: getLanguageList(formData, 'languages'),
    officeTools: getTextareaList(formData, 'officeTools'),
    extraTraining: getNullableString(formData, 'extraTraining'),
  });
}

export function parseObjetivosFormData(formData: FormData): ObjetivosStepPayload {
  const rawWorkModel = formData.get('workModel');
  const rawSeniority = formData.get('seniority');

  const workModel =
    rawWorkModel === 'onsite' || rawWorkModel === 'hybrid' || rawWorkModel === 'remote'
      ? rawWorkModel
      : null;

  const seniority =
    rawSeniority === 'junior' ||
    rawSeniority === 'mid' ||
    rawSeniority === 'senior' ||
    rawSeniority === 'manager'
      ? rawSeniority
      : null;

  return objetivosStepSchema.parse({
    targetRoles: getTargetRoles(formData, 'targetRoles'),
    targetSectors: getTextareaList(formData, 'targetSectors'),
    preferredLocations: getTextareaList(formData, 'preferredLocations'),
    workModel,
    seniority,
    preferencesNotes: getNullableString(formData, 'preferencesNotes'),
  });
}

export function parseResumenFormData(formData: FormData): ResumenStepPayload {
  return resumenStepSchema.parse({
    confirmed: formData.get('confirmed') === 'on' || formData.get('confirmed') === 'true',
  });
}
