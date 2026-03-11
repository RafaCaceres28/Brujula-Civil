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
  return militarStepSchema.parse({
    army: getNullableString(formData, 'army'),
    cuerpo: getNullableString(formData, 'cuerpo'),
    rank: getNullableString(formData, 'rank'),
    specialty: getNullableString(formData, 'specialty'),
    yearsOfService: getNullableNumber(formData, 'yearsOfService'),
    destinationType: getNullableString(formData, 'destinationType'),
  });
}

export function parseExperienciaFormData(formData: FormData): ExperienciaStepPayload {
  return experienciaStepSchema.parse({
    responsibilities: getTextareaList(formData, 'responsibilities'),
    missions: getTextareaList(formData, 'missions'),
    achievements: getTextareaList(formData, 'achievements'),
    tools: getTextareaList(formData, 'tools'),
  });
}

export function parseCompetenciasFormData(formData: FormData): CompetenciasStepPayload {
  return competenciasStepSchema.parse({
    technicalSkills: getTextareaList(formData, 'technicalSkills'),
    softSkills: getTextareaList(formData, 'softSkills'),
    certifications: getTextareaList(formData, 'certifications'),
    languages: getTextareaList(formData, 'languages'),
  });
}

export function parseObjetivosFormData(formData: FormData): ObjetivosStepPayload {
  const rawWorkModel = formData.get('workModel');

  const workModel =
    rawWorkModel === 'onsite' || rawWorkModel === 'hybrid' || rawWorkModel === 'remote'
      ? rawWorkModel
      : null;

  return objetivosStepSchema.parse({
    targetRoles: getTextareaList(formData, 'targetRoles'),
    targetSectors: getTextareaList(formData, 'targetSectors'),
    preferredLocations: getTextareaList(formData, 'preferredLocations'),
    workModel,
  });
}

export function parseResumenFormData(formData: FormData): ResumenStepPayload {
  return resumenStepSchema.parse({
    confirmed: formData.get('confirmed') === 'on' || formData.get('confirmed') === 'true',
  });
}
