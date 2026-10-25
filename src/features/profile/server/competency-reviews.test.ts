import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { structuredExperienceSchema } from '../../translation/schemas/structured-experience.schema';
import { buildExperienceProposals } from '../../translation/services/experience-proposals.builder';
import {
  competencyEvidenceKey,
  resolveCompetencyReview,
} from '../../translation/services/competency-review';
import { saveExperience } from './save-experience';
import { getProfile } from './get-profile';
import { profileClientFixture } from './profile-client.test-helper';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
const source = structuredExperienceSchema.parse({
  id: 'exp-review',
  activity: 'op_maintenance',
  stageIds: ['stage-1'],
  context: 'Taller',
  participation: ['assisted', 'coordinated'],
  maintenanceTasks: [
    { material: 'light_vehicles', operations: ['levels_functioning', 'periodic_checks'] },
    { material: 'communications_equipment', operations: ['coaxial_repair'] },
  ],
  otherTasks: [
    { description: 'Ordenaba', target: 'Material', confirmedDescription: 'Texto propio' },
  ],
});
const proposals = buildExperienceProposals([source]);
const reviews = proposals.map(({ civilianCompetencyCandidate: candidate }) => ({
  competencyId: candidate.id,
  evidenceKey: competencyEvidenceKey(candidate),
  decision: 'accepted' as const,
}));
function setup(experience = source) {
  const raw = {
    metadata: { untouched: true },
    careerHistory: {
      stages: [{ id: 'stage-1', focus: 'technical' }],
      experiences: [experience, { id: 'sibling', activity: 'analysis' }],
    },
  };
  const mock = profileClientFixture(raw);
  vi.mocked(createClient).mockResolvedValue(mock.client as never);
  return { ...mock, raw };
}
function edit(expectedExperience: unknown, set: unknown, clear: string[] = []) {
  return saveExperience('user-1', {
    operation: 'edit',
    id: source.id,
    expectedExperience,
    set,
    clear,
  });
}

beforeEach(() => vi.clearAllMocks());
describe('canonical competency decisions via existing CAS', () => {
  it('accepts, reloads, discards and resets using returned baselines, preserving exact source, siblings, stages and raw metadata', async () => {
    const mock = setup();
    mock.rows.app_user_profiles.push({
      user_id: 'user-1',
      display_name: 'Synthetic',
      email: 'synthetic@example.test',
    });
    const accepted = { ...source, competencyReviews: reviews };
    expect(await edit(source, { competencyReviews: reviews })).toEqual({
      ok: true,
      data: { experience: accepted },
    });
    expect(mock.calls.find((call) => call.operation === 'update')?.filters.rawGuard).toEqual(
      mock.raw,
    );
    expect((await getProfile('user-1'))!.careerHistory!.experiences).toEqual([
      accepted,
      { id: 'sibling', activity: 'analysis' },
    ]);
    expect(buildExperienceProposals([accepted])).toEqual(proposals);
    expect(resolveCompetencyReview(proposals[0].civilianCompetencyCandidate, accepted)).toBe(
      'accepted',
    );
    const discarded = {
      ...accepted,
      competencyReviews: [{ ...reviews[0], decision: 'discarded' as const }, reviews[1]],
    };
    expect(await edit(accepted, { competencyReviews: discarded.competencyReviews })).toMatchObject({
      ok: true,
      data: { experience: discarded },
    });
    expect(await edit(discarded, {}, ['competencyReviews'])).toMatchObject({
      ok: true,
      data: { experience: source },
    });
    expect(mock.rows.user_military_profiles[0].raw_profile_jsonb).toEqual(mock.raw);
  });

  it('rejects forged IDs, wrong-experience evidence and altered bindings without writing; create does not accept reviews', async () => {
    const mock = setup();
    for (const review of [
      { ...reviews[0], competencyId: 'invented' },
      { ...reviews[0], evidenceKey: 'invented' },
      { ...reviews[0], evidenceKey: reviews[1].evidenceKey },
    ]) {
      expect(await edit(source, { competencyReviews: [review] })).toMatchObject({
        error: { code: 'VALIDATION_ERROR' },
      });
    }
    expect(
      await saveExperience('user-1', {
        operation: 'create',
        experience: { ...source, competencyReviews: reviews },
      }),
    ).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(mock.calls.filter((call) => call.operation === 'update')).toHaveLength(0);
  });

  it.each(['accepted', 'discarded'] as const)(
    'preserves %s on metadata/reordering but retires only changed evidence without revival on source revert',
    async (decision) => {
      const decisions = reviews.map((review) => ({ ...review, decision }));
      const accepted = { ...source, competencyReviews: decisions };
      const mock = setup(accepted);
      const reordered = {
        ...accepted,
        frequency: 'occasional' as const,
        participation: [...source.participation!].reverse(),
        maintenanceTasks: [...source.maintenanceTasks!].reverse(),
      };
      expect(
        await edit(accepted, {
          frequency: reordered.frequency,
          participation: reordered.participation,
          maintenanceTasks: reordered.maintenanceTasks,
        }),
      ).toMatchObject({ ok: true, data: { experience: reordered } });
      const maintenanceTasks = source.maintenanceTasks!.map((entry) =>
        entry.material === 'light_vehicles'
          ? { ...entry, operations: ['periodic_checks' as const] }
          : entry,
      );
      const changed = { ...reordered, maintenanceTasks, competencyReviews: [decisions[1]] };
      expect(await edit(reordered, { maintenanceTasks })).toMatchObject({
        ok: true,
        data: { experience: changed },
      });
      expect(await edit(changed, { maintenanceTasks: source.maintenanceTasks })).toMatchObject({
        ok: true,
        data: { experience: { ...changed, maintenanceTasks: source.maintenanceTasks } },
      });
      const stored = (mock.rows.user_military_profiles[0].raw_profile_jsonb as typeof mock.raw)
        .careerHistory.experiences[0];
      expect(resolveCompetencyReview(proposals[0].civilianCompetencyCandidate, stored)).toBe(
        'pending',
      );
      expect(resolveCompetencyReview(proposals[1].civilianCompetencyCandidate, stored)).toBe(
        decision,
      );
    },
  );

  it('retires decisions on effective participation and instruction source removal without altering declared source fields', async () => {
    const accepted = { ...source, competencyReviews: reviews };
    setup(accepted);
    expect(await edit(accepted, { participation: ['performed'] })).toMatchObject({
      ok: true,
      data: { experience: { ...source, participation: ['performed'] } },
    });
    const instruction = {
      ...source,
      activity: 'instruction',
      instructionActivities: ['demonstrated' as const],
    };
    delete instruction.maintenanceTasks;
    const candidate = buildExperienceProposals([instruction])[0].civilianCompetencyCandidate;
    const reviewed = {
      ...instruction,
      competencyReviews: [
        {
          competencyId: candidate.id,
          evidenceKey: competencyEvidenceKey(candidate),
          decision: 'accepted' as const,
        },
      ],
    };
    setup(reviewed);
    const cleared = { ...source, activity: 'instruction' };
    delete cleared.maintenanceTasks;
    expect(await edit(reviewed, {}, ['instructionActivities'])).toEqual({
      ok: true,
      data: { experience: cleared },
    });
  });

  it('preserves a concurrent decision winner using the unchanged snapshot CAS', async () => {
    const mock = setup();
    const discarded = reviews.map((review) => ({ ...review, decision: 'discarded' as const }));
    mock.control.beforeUpdate = async () => {
      expect(await edit(source, { competencyReviews: discarded })).toMatchObject({ ok: true });
    };
    expect(await edit(source, { competencyReviews: reviews })).toMatchObject({
      error: { code: 'CONFLICT' },
    });
    expect(mock.rows.user_military_profiles[0].raw_profile_jsonb).toEqual({
      ...mock.raw,
      careerHistory: {
        ...mock.raw.careerHistory,
        experiences: [
          { ...source, competencyReviews: discarded },
          mock.raw.careerHistory.experiences[1],
        ],
      },
    });
  });

  it('does not overwrite a concurrent source winner or stale decision baseline', async () => {
    const mock = setup();
    mock.control.beforeUpdate = async () => {
      expect(await edit(source, { participation: ['performed'] })).toMatchObject({ ok: true });
    };
    expect(await edit(source, { competencyReviews: reviews })).toMatchObject({
      error: { code: 'CONFLICT' },
    });
    expect(await edit(source, { competencyReviews: reviews })).toMatchObject({
      error: { code: 'CONFLICT' },
    });
    expect(mock.rows.user_military_profiles[0].raw_profile_jsonb).toEqual({
      ...mock.raw,
      careerHistory: {
        ...mock.raw.careerHistory,
        experiences: [
          { ...source, participation: ['performed'] },
          mock.raw.careerHistory.experiences[1],
        ],
      },
    });
  });

  it('reports corrupt stored review shapes as integrity errors instead of silently dropping them', async () => {
    const mock = setup();
    mock.rows.user_military_profiles[0].raw_profile_jsonb = {
      careerHistory: {
        experiences: [{ ...source, competencyReviews: [{ ...reviews[0], decision: 'verified' }] }],
      },
    };
    expect(await edit(source, { frequency: 'occasional' })).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(mock.calls.filter((call) => call.operation === 'update')).toHaveLength(0);
  });
});
