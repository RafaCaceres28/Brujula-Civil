import { FUNCTION_TYPE_OPTIONS } from '../../wizard/config/wizard-catalogs';
import type { StructuredExperience } from '../schemas/structured-experience.schema';
import { INSTRUCTION_ACTIVITIES, type InstructionActivity } from '../config/instruction-activities';
import {
  MAINTENANCE_MATERIALS,
  MAINTENANCE_OPERATIONS,
  type MaintenanceOperation,
} from '../config/maintenance-catalog';
import type {
  ExperienceProposal,
  ExperienceProposalEvidence,
  TrainingParticipation,
} from '../types/experience-proposal.types';

const PARTICIPATION = {
  assisted: { action: 'Apoyo en', label: 'Ayudaba a realizarla' },
  performed: { action: 'Realización de', label: 'La realizaba personalmente' },
  coordinated: { action: 'Coordinación de', label: 'Coordinaba el trabajo de otras personas' },
  instructed: { action: 'Enseñanza en', label: 'Enseñaba a otros a realizarla' },
} satisfies Record<TrainingParticipation, { action: string; label: string }>;

const INSTRUCTION_PROPOSALS: Partial<
  Record<InstructionActivity, { description: string; competency: string }>
> = {
  demonstrated: {
    description: 'Apoyo al instructor mediante demostraciones prácticas.',
    competency: 'Apoyo práctico a actividades formativas',
  },
  explained_to_peers: {
    description: 'Explicación de procedimientos o contenidos a compañeros.',
    competency: 'Explicación de contenidos a compañeros',
  },
  prepared_and_delivered: {
    description: 'Preparación y explicación de contenidos o prácticas formativas.',
    competency: 'Preparación y exposición de contenidos formativos',
  },
};

// Only the explicit technical catalog activity supports the technical qualifier.
// Radio declarations retain their separate, unchanged military-to-civilian mapper.
export function buildExperienceProposals(
  experiences: readonly StructuredExperience[] = [],
): ExperienceProposal[] {
  const proposals: ExperienceProposal[] = [];
  const sorted = [...experiences].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  for (const experience of sorted) {
    const { activity, id: experienceId } = experience;
    if (activity === 'op_maintenance') {
      for (const material of Object.keys(
        MAINTENANCE_MATERIALS,
      ) as (keyof typeof MAINTENANCE_MATERIALS)[]) {
        const entry = experience.maintenanceTasks?.find((value) => value.material === material);
        if (!entry?.operations?.length) continue;
        const groups = new Map<string, MaintenanceOperation[]>();
        for (const operation of Object.keys(MAINTENANCE_OPERATIONS) as MaintenanceOperation[]) {
          if (!entry.operations.includes(operation)) continue;
          const category = MAINTENANCE_OPERATIONS[operation].category;
          const group = category === 'repair' ? operation : category;
          groups.set(group, [...(groups.get(group) ?? []), operation]);
        }
        for (const [group, operations] of groups) {
          const materialLabel = MAINTENANCE_MATERIALS[material].toLocaleLowerCase('es');
          const competency =
            group === 'inspect'
              ? `Comprobaciones básicas de funcionamiento de ${materialLabel}`
              : group === 'conserve'
                ? `${material === 'communications_equipment' ? 'Mantenimiento básico' : 'Conservación básica'} de ${materialLabel}`
                : group === 'report'
                  ? 'Comunicación de incidencias técnicas'
                  : group === 'coaxial_repair'
                    ? 'Reparación de cableado coaxial'
                    : 'Reparación de antenas';
          const indirect =
            !!experience.participation?.length && !experience.participation.includes('performed');
          const id = `maintenance:${encodeURIComponent(experienceId)}:${material}:${group}`;
          const evidence: ExperienceProposalEvidence = [
            { experienceId, field: 'structuredExperiences.activity', value: 'op_maintenance' },
            {
              experienceId,
              field: 'structuredExperiences.maintenanceTasks.material',
              value: material,
            },
            {
              experienceId,
              field: 'structuredExperiences.maintenanceTasks.operations',
              material,
              value: [...operations],
            },
            ...(indirect
              ? (Object.keys(PARTICIPATION) as TrainingParticipation[])
                  .filter((role) => experience.participation!.includes(role))
                  .map((role) => ({
                    experienceId,
                    field: 'structuredExperiences.participation' as const,
                    value: role,
                  }))
              : []),
          ];
          const tasks = operations
            .map((operation) => MAINTENANCE_OPERATIONS[operation].label.toLocaleLowerCase('es'))
            .join('; ');
          const description = `${indirect ? 'Participación en tareas de ' : ''}${tasks} en ${materialLabel}.`;
          proposals.push({
            id,
            experienceId,
            sourceLabel: FUNCTION_TYPE_OPTIONS.find((option) => option.value === activity)!.label,
            ...(indirect
              ? {
                  participationLabel: (Object.keys(PARTICIPATION) as TrainingParticipation[])
                    .filter((role) => experience.participation!.includes(role))
                    .map((role) => PARTICIPATION[role].label)
                    .join('; '),
                }
              : {}),
            maintenanceSource: { material, operations: [...operations] },
            cvDescription: {
              id: `cv:${id}`,
              experienceId,
              text: description[0].toLocaleUpperCase('es') + description.slice(1),
              basis: 'direct_declaration',
              requiresReview: true,
              evidence,
            },
            civilianCompetencyCandidate: {
              id: `competency:${id}`,
              experienceId,
              label: indirect
                ? `Participación en ${competency.toLocaleLowerCase('es')}`
                : competency,
              basis: 'direct_declaration',
              requiresReview: true,
              evidence: structuredClone(evidence),
            },
          });
        }
      }
      continue;
    }
    if (activity !== 'instruction' && activity !== 'technical_instruction') continue;

    // Instruction proposals require specific details, never generic participation alone.
    if (activity === 'instruction') {
      for (const detail of Object.keys(INSTRUCTION_ACTIVITIES) as InstructionActivity[]) {
        if (!experience.instructionActivities?.includes(detail)) continue;
        const content = INSTRUCTION_PROPOSALS[detail];
        if (!content) continue;
        const id = `instruction:${encodeURIComponent(experienceId)}:${detail}`;
        const evidence: ExperienceProposalEvidence = [
          { experienceId, field: 'structuredExperiences.activity', value: 'instruction' },
          { experienceId, field: 'structuredExperiences.instructionActivities', value: detail },
        ];
        proposals.push({
          id,
          experienceId,
          sourceLabel: FUNCTION_TYPE_OPTIONS.find((option) => option.value === activity)!.label,
          participationLabel: INSTRUCTION_ACTIVITIES[detail],
          cvDescription: {
            id: `cv:${id}`,
            experienceId,
            text: content.description,
            basis: 'direct_declaration',
            requiresReview: true,
            evidence,
          },
          civilianCompetencyCandidate: {
            id: `competency:${id}`,
            experienceId,
            label: content.competency,
            basis: 'direct_declaration',
            requiresReview: true,
            evidence: structuredClone(evidence),
          },
        });
      }
      continue;
    }

    for (const role of Object.keys(PARTICIPATION) as TrainingParticipation[]) {
      if (!experience.participation?.includes(role)) continue;

      const id = `training:${encodeURIComponent(experienceId)}:${activity}:${role}`;
      const subject = activity === 'technical_instruction' ? 'formación técnica' : 'formación';
      const label = `${PARTICIPATION[role].action} actividades de ${subject}`;
      const evidence: ExperienceProposalEvidence = [
        { experienceId, field: 'structuredExperiences.activity', value: activity },
        { experienceId, field: 'structuredExperiences.participation', value: role },
      ];
      proposals.push({
        id,
        experienceId,
        sourceLabel: FUNCTION_TYPE_OPTIONS.find((option) => option.value === activity)!.label,
        participationLabel: PARTICIPATION[role].label,
        cvDescription: {
          id: `cv:${id}`,
          experienceId,
          text: `${label}.`,
          basis: 'direct_declaration',
          requiresReview: true,
          evidence,
        },
        civilianCompetencyCandidate: {
          id: `competency:${id}`,
          experienceId,
          label,
          basis: 'direct_declaration',
          requiresReview: true,
          evidence: [{ ...evidence[0] }, { ...evidence[1] }],
        },
      });
    }
  }
  return proposals;
}
