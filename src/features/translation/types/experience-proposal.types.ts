import type { StructuredExperience } from '../schemas/structured-experience.schema';

export type TrainingParticipation = NonNullable<StructuredExperience['participation']>[number];

export type ExperienceProposalEvidence = [
  {
    experienceId: string;
    field: 'structuredExperiences.activity';
    value: 'instruction' | 'technical_instruction';
  },
  {
    experienceId: string;
    field: 'structuredExperiences.participation';
    value: TrainingParticipation;
  },
];

type ExperienceProposalSource = {
  experienceId: string;
  basis: 'direct_declaration';
  requiresReview: true;
  evidence: ExperienceProposalEvidence;
};

export type ExperienceProposal = {
  id: string;
  experienceId: string;
  sourceLabel: string;
  participationLabel: string;
  cvDescription: ExperienceProposalSource & { id: string; text: string };
  civilianCompetencyCandidate: ExperienceProposalSource & { id: string; label: string };
};
