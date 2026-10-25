import type { StructuredExperience } from '@/features/translation/schemas/structured-experience.schema';
import { resolveCompetencyReview } from '@/features/translation/services/competency-review';
import { buildExperienceProposals } from '@/features/translation/services/experience-proposals.builder';
import { FUNCTION_TYPE_OPTIONS } from '@/features/wizard/config/wizard-catalogs';

export function selectConfirmedProfessionalContent(experiences: readonly StructuredExperience[]) {
  const proposals = buildExperienceProposals(experiences);
  const sources = experiences.map((experience, index) => ({
    experience,
    origin: `${FUNCTION_TYPE_OPTIONS.find((option) => option.value === experience.activity)!.label} · Experiencia ${index + 1}`,
  }));
  const descriptions = sources.flatMap(({ experience, origin }) =>
    (experience.otherTasks ?? []).flatMap((task, index) =>
      task.confirmedDescription
        ? [{ id: `${experience.id}:${index}`, sourceId: experience.id, origin, task, index }]
        : [],
    ),
  );
  const competencies = sources.flatMap(({ experience, origin }) =>
    proposals.flatMap(({ civilianCompetencyCandidate: candidate }) =>
      candidate.experienceId === experience.id &&
      resolveCompetencyReview(candidate, experience) === 'accepted'
        ? [{ candidate, origin }]
        : [],
    ),
  );
  return { descriptions, competencies };
}
