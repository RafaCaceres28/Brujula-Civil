import type { TranslationOutput } from '../schemas/translation.schema';
import type { CompetenciasStep } from '@/features/wizard/schemas/wizard.schema';

export type ContractVersion = `${number}.${number}.${number}`;

export type GeneratedArtifactType = 'summary' | 'skills' | 'role_suggestion' | 'evidence';

export type GeneratedArtifactSource = 'llm' | 'rule' | 'hybrid';

export type SuggestionPriority = 'high' | 'medium' | 'low';

export type TranslationResult = TranslationOutput;

export type GeneratedTranslationArtifact = {
  artifactType: GeneratedArtifactType;
  content: string;
  contractVersion: ContractVersion;
  source?: GeneratedArtifactSource;
  confidence?: number | null;
};

export type TranslationSuggestion = {
  id: string;
  label: string;
  contractVersion: ContractVersion;
  rationale?: string | null;
  priority?: SuggestionPriority;
  evidence?: string | null;
};

export type NormalizedCompetencies = {
  technicalSkills: CompetenciasStep['technicalSkills'];
  softSkills: CompetenciasStep['softSkills'];
  certifications: CompetenciasStep['certifications'];
  drivingLicenses: CompetenciasStep['drivingLicenses'];
  languages: CompetenciasStep['languages'];
  officeTools: CompetenciasStep['officeTools'];
  extraTraining: CompetenciasStep['extraTraining'];
};

export type TranslationFinalResult = TranslationResult & {
  artifacts: GeneratedTranslationArtifact[];
  suggestions: TranslationSuggestion[];
  normalizedCompetencies: NormalizedCompetencies;
  contractVersion: ContractVersion;
};

export type GenerateTranslationInput = {
  userId: string;
};
