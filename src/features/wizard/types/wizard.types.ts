import type {
  UserWizardStateRow,
  WizardStepKeyDb,
  WizardStepStateRow,
} from '@/types/database.types';
import type { z } from 'zod';
import type { WizardStepSlug } from '../config/wizard-steps';
import type {
  competenciasStepSchema,
  experienciaStepSchema,
  militarStepSchema,
  objetivosStepSchema,
  onboardingDraftSchema,
  resumenStepSchema,
} from '../schemas/wizard.schema';

export type { WizardStepKeyDb, WizardStepSlug };

export type WizardStatus = 'not_started' | 'in_progress' | 'completed';

export type MilitarStepPayload = z.infer<typeof militarStepSchema>;
export type ExperienciaStepPayload = z.infer<typeof experienciaStepSchema>;
export type CompetenciasStepPayload = z.infer<typeof competenciasStepSchema>;
export type ObjetivosStepPayload = z.infer<typeof objetivosStepSchema>;
export type ResumenStepPayload = z.infer<typeof resumenStepSchema>;
export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;

export type WizardPayloadBySlug = {
  militar: MilitarStepPayload;
  experiencia: ExperienciaStepPayload;
  competencias: CompetenciasStepPayload;
  objetivos: ObjetivosStepPayload;
  resumen: ResumenStepPayload;
};

export type OnboardingOverview = {
  state: UserWizardStateRow | null;
  steps: WizardStepStateRow[];
  completedStepKeys: WizardStepKeyDb[];
  draft: OnboardingDraft;
};
