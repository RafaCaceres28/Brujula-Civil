import { describe, expect, it } from 'vitest';
import {
  structuredExperienceSchema,
  type StructuredExperience,
} from '../schemas/structured-experience.schema';
import { buildExperienceProposals } from './experience-proposals.builder';
import { competencyEvidenceKey, resolveCompetencyReview } from './competency-review';

const source: StructuredExperience = {
  id: 'experience:1',
  activity: 'op_maintenance',
  participation: ['assisted', 'coordinated'],
  maintenanceTasks: [
    { material: 'light_vehicles', operations: ['levels_functioning', 'periodic_checks'] },
    { material: 'communications_equipment', operations: ['coaxial_repair'] },
  ],
};
const candidate = buildExperienceProposals([source])[0].civilianCompetencyCandidate;
const review = {
  competencyId: candidate.id,
  evidenceKey: competencyEvidenceKey(candidate),
  decision: 'accepted' as const,
};

describe('evidence-bound competency review', () => {
  it('reads old experiences as pending and only resolves a matching candidate, evidence and experience', () => {
    expect(resolveCompetencyReview(candidate, source)).toBe('pending');
    const reviewed = { ...source, competencyReviews: [review] };
    expect(resolveCompetencyReview(candidate, reviewed)).toBe('accepted');
    expect(resolveCompetencyReview(candidate, { ...reviewed, id: 'another' })).toBe('pending');
    expect(resolveCompetencyReview({ ...candidate, id: 'another' }, reviewed)).toBe('pending');
    expect(resolveCompetencyReview({ ...candidate, label: 'Changed meaning' }, reviewed)).toBe(
      'pending',
    );
    expect(
      resolveCompetencyReview(candidate, {
        ...source,
        competencyReviews: [{ ...review, decision: 'discarded' }],
      }),
    ).toBe('discarded');
  });

  it('normalizes evidence records, operation sets and source ordering, ignoring unrelated metadata', () => {
    const reordered: StructuredExperience = {
      ...source,
      autonomy: 'supervised',
      context: 'Changed narrative',
      otherTasks: [
        { description: 'Otra tarea', target: 'Material', confirmedDescription: 'Texto propio' },
      ],
      participation: [...source.participation!].reverse(),
      maintenanceTasks: [...source.maintenanceTasks!]
        .reverse()
        .map((entry) => ({ ...entry, operations: [...entry.operations!].reverse() })),
    };
    expect(buildExperienceProposals([reordered, { id: 'before', activity: 'analysis' }])).toEqual(
      buildExperienceProposals([source]),
    );
    expect(
      competencyEvidenceKey({
        ...candidate,
        evidence: [...candidate.evidence].reverse() as typeof candidate.evidence,
      }),
    ).toBe(review.evidenceKey);
    expect(
      resolveCompetencyReview(
        buildExperienceProposals([reordered])[0].civilianCompetencyCandidate,
        { ...reordered, competencyReviews: [review] },
      ),
    ).toBe('accepted');
  });

  it('invalidates both decisions when actual grouped operations or effective participation change under the same candidate ID', () => {
    for (const changed of [
      {
        ...source,
        maintenanceTasks: [
          { material: 'light_vehicles' as const, operations: ['periodic_checks' as const] },
        ],
      },
      { ...source, participation: ['assisted' as const] },
    ]) {
      const next = buildExperienceProposals([changed])[0].civilianCompetencyCandidate;
      expect(next.id).toBe(candidate.id);
      expect(competencyEvidenceKey(next)).not.toBe(review.evidenceKey);
      for (const decision of ['accepted', 'discarded'] as const) {
        expect(
          resolveCompetencyReview(next, {
            ...changed,
            competencyReviews: [{ ...review, decision }],
          }),
        ).toBe('pending');
      }
    }
  });

  it('preserves valid optional reviews including long encoded builder IDs and rejects malformed or duplicate data', () => {
    const long = { ...source, id: `x${':'.repeat(127)}` };
    const longCandidate = buildExperienceProposals([long])[0].civilianCompetencyCandidate;
    expect(
      structuredExperienceSchema.safeParse({
        ...long,
        competencyReviews: [
          {
            ...review,
            competencyId: longCandidate.id,
            evidenceKey: competencyEvidenceKey(longCandidate),
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      structuredExperienceSchema.parse({ ...source, competencyReviews: [review] })
        .competencyReviews,
    ).toEqual([review]);
    for (const competencyReviews of [
      null,
      [],
      [review, review],
      [{ ...review, decision: 'pending' }],
      [{ ...review, evidenceKey: '' }],
      [{ ...review, evidenceKey: 'x'.repeat(4097) }],
      [{ ...review, verified: true }],
    ]) {
      expect(structuredExperienceSchema.safeParse({ ...source, competencyReviews }).success).toBe(
        false,
      );
    }
  });
});
