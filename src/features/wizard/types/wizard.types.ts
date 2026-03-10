import type { WizardStepKeyDb } from '@/types/database.types';
import type { WizardStepSlug } from '../config/wizard-steps';

export type { WizardStepKeyDb, WizardStepSlug };

export type WizardStatus = 'not_started' | 'in_progress' | 'completed';

export type MilitarStepPayload = {
  army: string | null;
  branch: string | null;
  rank: string | null;
  specialty: string | null;
  yearsOfService: number | null;
  destinationType: string | null;
};

export type ExperienciaStepPayload = {
  responsibilities: string[];
  missions: string[];
  achievements: string[];
  tools: string[];
};

export type CompetenciasStepPayload = {
  technicalSkills: string[];
  softSkills: string[];
  certifications: string[];
  languages: string[];
};

export type ObjetivosStepPayload = {
  targetRoles: string[];
  targetSectors: string[];
  preferredLocations: string[];
  workModel: 'onsite' | 'hybrid' | 'remote' | null;
};

export type ResumenStepPayload = {
  confirmed: boolean;
};

export type WizardPayloadBySlug = {
  militar: MilitarStepPayload;
  experiencia: ExperienciaStepPayload;
  competencias: CompetenciasStepPayload;
  objetivos: ObjetivosStepPayload;
  resumen: ResumenStepPayload;
};
