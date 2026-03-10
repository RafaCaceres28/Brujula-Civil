import type { WizardStepKeyDb } from '@/types/database.types';

export const WIZARD_STEPS = [
  {
    slug: 'militar',
    dbKey: 'military_background',
    label: 'Perfil militar',
    route: '/onboarding/militar',
    order: 1,
  },
  {
    slug: 'experiencia',
    dbKey: 'missions_achievements',
    label: 'Experiencia',
    route: '/onboarding/experiencia',
    order: 2,
  },
  {
    slug: 'competencias',
    dbKey: 'skills_tools',
    label: 'Competencias',
    route: '/onboarding/competencias',
    order: 3,
  },
  {
    slug: 'objetivos',
    dbKey: 'preferences',
    label: 'Objetivos',
    route: '/onboarding/objetivos',
    order: 4,
  },
  {
    slug: 'resumen',
    dbKey: 'review',
    label: 'Resumen',
    route: '/onboarding/resumen',
    order: 5,
  },
] as const;

export type WizardStepSlug = (typeof WIZARD_STEPS)[number]['slug'];

export const FIRST_WIZARD_DB_STEP: WizardStepKeyDb = WIZARD_STEPS[0].dbKey;

export function getStepBySlug(slug: WizardStepSlug) {
  return WIZARD_STEPS.find((step) => step.slug === slug)!;
}

export function getStepByDbKey(dbKey: WizardStepKeyDb) {
  return WIZARD_STEPS.find((step) => step.dbKey === dbKey) ?? null;
}

export function getAllStepSlugs() {
  return WIZARD_STEPS.map((step) => step.slug);
}

export function getAllDbKeys() {
  return WIZARD_STEPS.map((step) => step.dbKey);
}

export function getStepRouteBySlug(slug: WizardStepSlug) {
  return getStepBySlug(slug).route;
}

export function getStepRouteByDbKey(dbKey: WizardStepKeyDb) {
  const step = getStepByDbKey(dbKey);
  return step ? step.route : WIZARD_STEPS[0].route;
}

export function getNextStepSlug(slug: WizardStepSlug): WizardStepSlug | null {
  const index = WIZARD_STEPS.findIndex((step) => step.slug === slug);

  if (index === -1 || index === WIZARD_STEPS.length - 1) {
    return null;
  }

  return WIZARD_STEPS[index + 1].slug;
}

export function getPreviousStepSlug(slug: WizardStepSlug): WizardStepSlug | null {
  const index = WIZARD_STEPS.findIndex((step) => step.slug === slug);

  if (index <= 0) {
    return null;
  }

  return WIZARD_STEPS[index - 1].slug;
}

export function getStepOrderBySlug(slug: WizardStepSlug) {
  return getStepBySlug(slug).order;
}

export function getDbKeyBySlug(slug: WizardStepSlug): WizardStepKeyDb {
  return getStepBySlug(slug).dbKey;
}

export function isValidWizardStepSlug(value: string): value is WizardStepSlug {
  return WIZARD_STEPS.some((step) => step.slug === value);
}
