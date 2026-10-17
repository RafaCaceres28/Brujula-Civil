import { FUNCTION_TYPE_OPTIONS } from '../../wizard/config/wizard-catalogs';
import type { StructuredExperience } from '../schemas/structured-experience.schema';
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

// Only the explicit technical catalog activity supports the technical qualifier.
// Radio declarations retain their separate, unchanged military-to-civilian mapper.
export function buildExperienceProposals(
  experiences: readonly StructuredExperience[] = [],
): ExperienceProposal[] {
  const proposals: ExperienceProposal[] = [];
  const sorted = [...experiences].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  for (const experience of sorted) {
    const { activity, id: experienceId } = experience;
    if (activity !== 'instruction' && activity !== 'technical_instruction') continue;

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
