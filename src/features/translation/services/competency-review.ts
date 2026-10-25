import type { StructuredExperience } from '../schemas/structured-experience.schema';
import type { ExperienceProposal } from '../types/experience-proposal.types';

type Candidate = ExperienceProposal['civilianCompetencyCandidate'];
export type CompetencyReviewDecision = NonNullable<
  StructuredExperience['competencyReviews']
>[number]['decision'];

// Snapshot of selector evidence only, not narrative or list positions. Normalize sets and
// property order so reordering source declarations cannot move a decision to another candidate.
export function competencyEvidenceKey(candidate: Candidate): string {
  const evidence = candidate.evidence.map((entry) =>
    JSON.stringify([
      entry.experienceId,
      entry.field,
      'material' in entry ? entry.material : null,
      Array.isArray(entry.value) ? [...new Set(entry.value)].sort() : entry.value,
    ]),
  );
  return JSON.stringify(['v1', candidate.id, candidate.label, [...new Set(evidence)].sort()]);
}

export function resolveCompetencyReview(
  candidate: Candidate,
  experience: StructuredExperience,
): CompetencyReviewDecision | 'pending' {
  if (candidate.experienceId !== experience.id) return 'pending';
  return (
    experience.competencyReviews?.find(
      (review) =>
        review.competencyId === candidate.id &&
        review.evidenceKey === competencyEvidenceKey(candidate),
    )?.decision ?? 'pending'
  );
}
