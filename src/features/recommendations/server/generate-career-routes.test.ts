import { afterEach, describe, expect, it, vi } from 'vitest';
import { recommendationInputFixture } from './__fixtures__/recommendation-fixtures';
import { generateCareerRoutes } from './generate-career-routes';
import * as recommendationRules from '../services/route-recommendation-rules';
import { buildRecommendationContext } from '../services/build-recommendation-input';
import { onboardingDraftStateSchema } from '../../wizard/schemas/wizard-state.schema';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateCareerRoutes', () => {
  const overview = { draft: onboardingDraftStateSchema.parse({}) };

  it.each([
    'coordination',
    'team_supervision',
    'supervision',
    'facility_security',
    'instruction',
    'equipment_operation',
    'analysis',
    'reporting',
    'incident_management',
  ])(
    'accepts concrete canonical activity %s recognized by existing rules without wizard',
    (activity) => {
      const context = buildRecommendationContext({
        userId: 'user-1',
        overview,
        careerHistory: { experiences: [{ id: 'exp-1', activity }] },
      });
      const result = generateCareerRoutes(context.input, { source: context.source });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected evidence-based routes');
      expect(result.data.routes).toHaveLength(5);
      expect(
        result.data.routes.some((route) =>
          route.explanation?.explanationKeywords.includes(activity),
        ),
      ).toBe(true);
      expect(JSON.stringify(result.data)).not.toContain('exp-1');
    },
  );

  it.each([
    'technical_instruction',
    'op_maintenance',
    'logistics_supply',
    'execution',
    'emergency_first_aid',
    'administrative_support',
    'resource_management',
  ])('does not invent an equivalence for unsupported activity %s', (activity) => {
    const context = buildRecommendationContext({
      userId: 'user-1',
      overview: {
        draft: onboardingDraftStateSchema.parse({
          militar: {
            branch: 'army',
            corps: 'engineers',
            rank: { code: 'captain', label: 'Capitan' },
            specialty: { code: 'communications', label: 'Comunicaciones' },
          },
          experiencia: { functionTypes: ['instruction'], responsibilityAreas: ['training'] },
          competencias: { softSkills: ['leadership'] },
          objetivos: { targetSectors: ['training'] },
        }),
      },
      careerHistory: {
        experiences: [
          { id: 'exp-1', activity, participation: ['instructed'], autonomy: 'autonomous' },
        ],
      },
    });
    expect(generateCareerRoutes(context.input, { source: context.source })).toMatchObject({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Insufficient structured profile to generate career routes',
      },
    });
  });

  it('rejects explicit empty even when identity and legacy skills pass the old gate', () => {
    const source = {
      kind: 'career_history' as const,
      history: { experiences: [] },
      wizardTools: [],
    };
    expect(
      generateCareerRoutes({ ...recommendationInputFixture, functionTypes: [] }, { source }),
    ).toMatchObject({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Insufficient structured profile to generate career routes',
      },
    });
    expect(generateCareerRoutes(recommendationInputFixture).ok).toBe(true);
    expect(
      generateCareerRoutes(recommendationInputFixture, { source: { kind: 'legacy_wizard' } }).ok,
    ).toBe(true);
  });

  it.each([
    { kind: 'career_history', history: null, wizardTools: [] },
    {
      kind: 'career_history',
      history: { experiences: [{ id: 'bad', activity: 'not-valid' }] },
      wizardTools: [],
    },
    {
      kind: 'career_history',
      history: { experiences: [{ id: 'one', activity: 'instruction' }] },
      wizardTools: [],
    },
    {
      kind: 'career_history',
      history: {
        experiences: [
          { id: 'one', activity: 'analysis' },
          { id: 'one', activity: 'analysis' },
        ],
      },
      wizardTools: [],
    },
    {
      kind: 'career_history',
      history: { experiences: [{ id: 'one', activity: 'analysis', stageIds: ['missing'] }] },
      wizardTools: [],
    },
    { kind: 'unknown' },
  ])(
    'returns safe integrity error, never insufficiency or fallback for invalid sidecar %j',
    (source) => {
      const result = generateCareerRoutes(recommendationInputFixture, { source: source as never });
      expect(result).toMatchObject({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          retryable: false,
          message: 'Unable to generate career routes at this time',
        },
      });
      expect(JSON.stringify(result)).not.toMatch(/not-valid|Zod|stack|wizardTools/);
    },
  );

  it('requires exact unique canonical activity set, without injected or duplicate tokens', () => {
    const context = buildRecommendationContext({
      userId: 'user-1',
      overview,
      careerHistory: { experiences: [{ id: 'one', activity: 'analysis' }] },
    });
    for (const functionTypes of [[], ['analysis', 'instruction'], ['analysis', 'analysis']]) {
      expect(
        generateCareerRoutes({ ...context.input, functionTypes }, { source: context.source }),
      ).toMatchObject({ ok: false, error: { code: 'INTERNAL_ERROR' } });
    }
    const two = buildRecommendationContext({
      userId: 'user-1',
      overview,
      careerHistory: {
        experiences: [
          { id: 'one', activity: 'analysis' },
          { id: 'two', activity: 'instruction' },
        ],
      },
    });
    expect(
      generateCareerRoutes(
        { ...two.input, functionTypes: ['analysis', 'analysis'] },
        { source: two.source },
      ),
    ).toMatchObject({ ok: false, error: { code: 'INTERNAL_ERROR' } });
  });

  it('does not amplify repeated evidence or synthesize cross-record equipment/activity capabilities', () => {
    const history = {
      experiences: [
        { id: 'analysis-1', activity: 'analysis' },
        { id: 'maintenance', activity: 'op_maintenance', equipment: 'radio_comms' },
      ],
    };
    const context = buildRecommendationContext({
      userId: 'user-1',
      overview,
      careerHistory: history,
    });
    const duplicate = buildRecommendationContext({
      userId: 'user-1',
      overview,
      careerHistory: {
        experiences: [...history.experiences, { id: 'analysis-2', activity: 'analysis' }],
      },
    });
    const now = new Date('2026-01-01T00:00:00Z');
    const result = generateCareerRoutes(context.input, { source: context.source, now });
    expect(generateCareerRoutes(duplicate.input, { source: duplicate.source, now })).toEqual(
      result,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected routes');
    const keywords = result.data.routes.flatMap(
      (route) => route.explanation?.explanationKeywords ?? [],
    );
    expect(keywords).not.toContain('communications');
    expect(keywords).not.toContain('industrial_maintenance');
    const unsupported = buildRecommendationContext({
      userId: 'user-1',
      overview,
      careerHistory: {
        experiences: [
          { id: 'maintenance', activity: 'op_maintenance' },
          { id: 'radio', activity: 'execution', equipment: 'radio_comms' },
        ],
      },
    });
    expect(generateCareerRoutes(unsupported.input, { source: unsupported.source })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('returns a valid recommendation shortlist for valid structured input', () => {
    const result = generateCareerRoutes(recommendationInputFixture, {
      now: new Date('2026-03-24T03:00:00.000Z'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.recommendationSetId).toBe('recset-snapshot-1-20260324030000');
    expect(result.data.routes.length).toBeGreaterThanOrEqual(3);
    expect(result.data.routes.length).toBeLessThanOrEqual(5);

    for (const route of result.data.routes) {
      expect(route.explanation).toBeDefined();
      expect(route.explanation?.reasonSummary).toBe(route.reasonSummary);
      expect(route.explanation?.fitLabel).toMatch(/alto|medio|exploratorio/);
      expect(route.explanation?.fitScore).toBeGreaterThanOrEqual(0);
      expect(route.explanation?.fitScore).toBeLessThanOrEqual(100);
      expect(route.explanation?.decisionGuidance.length).toBeGreaterThanOrEqual(8);
      expect(route.explanation?.explanationKeywords.length).toBeGreaterThan(0);
    }
  });

  it('normalizes incomplete explanation payload to preserve explainability contract', () => {
    vi.spyOn(recommendationRules, 'buildCareerRouteShortlist').mockReturnValue([
      {
        routeId: 'route-project-manager-logistics-mid',
        roleId: 'project-manager',
        sectorId: 'logistics',
        seniorityId: 'mid',
        reasonSummary: 'Se recomienda por continuidad de planificacion y coordinacion.',
        matchedSignals: ['UNKNOWN_REASON_CODE'],
      },
      {
        routeId: 'route-operations-coordinator-logistics-mid',
        roleId: 'operations-coordinator',
        sectorId: 'logistics',
        seniorityId: 'mid',
        reasonSummary: 'Se recomienda por experiencia operativa en logistica.',
        matchedSignals: ['TARGET_SECTOR_HINT'],
      },
      {
        routeId: 'route-team-lead-technology-mid',
        roleId: 'team-lead',
        sectorId: 'technology',
        seniorityId: 'mid',
        reasonSummary: 'Se recomienda por supervision de equipos y coordinacion.',
        matchedSignals: ['LEADERSHIP_MATCH'],
      },
    ]);

    const result = generateCareerRoutes(recommendationInputFixture, {
      now: new Date('2026-03-24T03:30:00.000Z'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    for (const route of result.data.routes) {
      expect(route.explanation).toMatchObject({
        reasonSummary: route.reasonSummary,
      });
      expect(route.explanation?.explanationKeywords.length).toBeGreaterThan(0);
      expect(route.explanation?.decisionGuidance).toContain('ruta');
    }
  });

  it('returns validation error when profile signals are insufficient', () => {
    const result = generateCareerRoutes({
      ...recommendationInputFixture,
      branch: undefined,
      corps: undefined,
      rank: undefined,
      specialty: 'signals',
      responsibilityAreas: [],
      functionTypes: [],
      technicalSkills: [],
      softSkills: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.message).toBe('Insufficient structured profile to generate career routes');
    expect(result.error.message).not.toMatch(/zod|stack|trace/i);
    expect(result.error.details).toBeUndefined();
    expect(result.meta?.source).toBe('recs.server.generate-routes');
  });

  it('returns safe fallback error when shortlist generation yields no routes', () => {
    vi.spyOn(recommendationRules, 'buildCareerRouteShortlist').mockReturnValue([]);

    const result = generateCareerRoutes(recommendationInputFixture, {
      now: new Date('2026-03-24T04:00:00.000Z'),
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.message).toBe('No compatible career routes found for current profile');
    expect(result.error.details).toBeUndefined();
    expect(result.meta?.source).toBe('recs.server.generate-routes');
  });
});
