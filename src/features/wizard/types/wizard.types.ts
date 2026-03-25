import type {
  UserWizardStateRow,
  WizardStepKeyDb,
  WizardStepStateRow,
} from '@/types/database.types';
import type { z } from 'zod';
import type { WizardStepSlug } from '../config/wizard-steps';
import type { EmployabilityFlowDraft } from './wizard-state.types';
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

export type OnboardingStructuredFieldPath =
  | 'militar.branch'
  | 'militar.corps'
  | 'militar.rank.code'
  | 'militar.specialty.code'
  | 'militar.serviceYears'
  | 'militar.destinationContext'
  | 'militar.leadershipLevel'
  | 'militar.teamSize'
  | 'experiencia.responsibilityAreas'
  | 'experiencia.missionTypes'
  | 'experiencia.functionTypes'
  | 'experiencia.tools'
  | 'experiencia.leadershipScopes'
  | 'competencias.technicalSkills'
  | 'competencias.softSkills'
  | 'competencias.certifications'
  | 'competencias.drivingLicenses'
  | 'competencias.languages'
  | 'competencias.officeTools'
  | 'objetivos.targetRoles'
  | 'objetivos.targetSectors'
  | 'objetivos.preferredLocations'
  | 'objetivos.workModel'
  | 'objetivos.seniority';

export type OnboardingNarrativeFieldPath =
  | 'militar.unitName'
  | 'militar.notes'
  | 'experiencia.achievements'
  | 'experiencia.additionalContext'
  | 'competencias.extraTraining'
  | 'objetivos.preferencesNotes';

export type GuidedControlKind = 'single' | 'multi' | 'radio' | 'checkbox' | 'compound' | 'number';

export type OnboardingFieldControlMap = {
  structured: Record<OnboardingStructuredFieldPath, GuidedControlKind>;
  narrative: Record<OnboardingNarrativeFieldPath, 'text' | 'textarea' | 'textarea-list'>;
};

export type OnboardingStructuredDraft = {
  militar: Pick<
    MilitarStepPayload,
    | 'branch'
    | 'corps'
    | 'rank'
    | 'specialty'
    | 'serviceYears'
    | 'destinationContext'
    | 'leadershipLevel'
    | 'teamSize'
  >;
  experiencia: Pick<
    ExperienciaStepPayload,
    'responsibilityAreas' | 'missionTypes' | 'functionTypes' | 'tools' | 'leadershipScopes'
  >;
  competencias: Pick<
    CompetenciasStepPayload,
    | 'technicalSkills'
    | 'softSkills'
    | 'certifications'
    | 'drivingLicenses'
    | 'languages'
    | 'officeTools'
  >;
  objetivos: Pick<
    ObjetivosStepPayload,
    'targetRoles' | 'targetSectors' | 'preferredLocations' | 'workModel' | 'seniority'
  >;
};

export type OnboardingNarrativeDraft = {
  militar: Pick<MilitarStepPayload, 'unitName' | 'notes'>;
  experiencia: Pick<ExperienciaStepPayload, 'achievements' | 'additionalContext'>;
  competencias: Pick<CompetenciasStepPayload, 'extraTraining'>;
  objetivos: Pick<ObjetivosStepPayload, 'preferencesNotes'>;
};

export type GuidedOnboardingDraft = {
  structured: OnboardingStructuredDraft;
  narrative: OnboardingNarrativeDraft;
  resumen: ResumenStepPayload;
};

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
  employabilityFlow?: EmployabilityFlowDraft;
};
