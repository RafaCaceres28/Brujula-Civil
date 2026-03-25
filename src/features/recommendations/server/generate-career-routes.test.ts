import { afterEach, describe, expect, it, vi } from 'vitest';
import { recommendationInputFixture } from './__fixtures__/recommendation-fixtures';
import { generateCareerRoutes } from './generate-career-routes';
import * as recommendationRules from '../services/route-recommendation-rules';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateCareerRoutes', () => {
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
