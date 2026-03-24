import { describe, expect, it } from 'vitest';
import { recommendationInputFixture } from './__fixtures__/recommendation-fixtures';
import { generateCareerRoutes } from './generate-career-routes';

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
  });

  it('returns validation error when profile signals are insufficient', () => {
    const result = generateCareerRoutes({
      ...recommendationInputFixture,
      branch: undefined,
      corps: undefined,
      rank: undefined,
      specialty: undefined,
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
  });
});
