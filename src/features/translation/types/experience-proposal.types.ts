import type { StructuredExperience } from '../schemas/structured-experience.schema';
import type { MaintenanceMaterial, MaintenanceOperation } from '../config/maintenance-catalog';

export type TrainingParticipation = NonNullable<StructuredExperience['participation']>[number];

export type ExperienceProposalEvidence =
  | [
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
    ]
  | [
      { experienceId: string; field: 'structuredExperiences.activity'; value: 'op_maintenance' },
      {
        experienceId: string;
        field: 'structuredExperiences.maintenanceTasks.material';
        value: MaintenanceMaterial;
      },
      {
        experienceId: string;
        field: 'structuredExperiences.maintenanceTasks.operations';
        material: MaintenanceMaterial;
        value: MaintenanceOperation[];
      },
      ...{
        experienceId: string;
        field: 'structuredExperiences.participation';
        value: TrainingParticipation;
      }[],
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
  participationLabel?: string;
  maintenanceSource?: {
    material: MaintenanceMaterial;
    operations: MaintenanceOperation[];
  };
  cvDescription: ExperienceProposalSource & { id: string; text: string };
  civilianCompetencyCandidate: ExperienceProposalSource & { id: string; label: string };
};
