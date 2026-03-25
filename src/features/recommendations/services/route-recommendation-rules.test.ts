import { describe, expect, it } from 'vitest';
import { recommendationInputFixture } from '../server/__fixtures__/recommendation-fixtures';
import { buildCareerRouteShortlist } from './route-recommendation-rules';

describe('buildCareerRouteShortlist', () => {
  it('prioritizes role and sector hints and keeps deterministic tie-breaking', () => {
    const shortlist = buildCareerRouteShortlist({
      ...recommendationInputFixture,
      targetRoleHints: ['project-manager'],
      targetSectorHints: ['logistics'],
      responsibilityAreas: ['planning'],
      functionTypes: ['analysis', 'coordination'],
      technicalSkills: ['process_improvement'],
      softSkills: ['leadership'],
      teamSize: 18,
      leadership: true,
    });

    expect(shortlist.length).toBeGreaterThanOrEqual(3);
    expect(shortlist.length).toBeLessThanOrEqual(5);
    expect(shortlist[0]).toMatchObject({
      roleId: 'project-manager',
      sectorId: 'logistics',
    });
  });

  it('returns stable order when candidates have equal score', () => {
    const shortlist = buildCareerRouteShortlist({
      ...recommendationInputFixture,
      targetRoleHints: [],
      targetSectorHints: [],
      leadership: false,
      teamSize: 0,
      responsibilityAreas: [],
      missionTypes: [],
      functionTypes: [],
      tools: [],
      technicalSkills: [],
      softSkills: [],
      certifications: [],
      drivingLicenses: [],
      languages: [],
      officeTools: [],
    });

    const routeIds = shortlist.map((route) => route.routeId);
    const sortedRouteIds = [...routeIds].sort((left, right) => left.localeCompare(right));

    expect(shortlist).toHaveLength(5);
    expect(routeIds).toEqual(sortedRouteIds);
    expect(new Set(routeIds).size).toBe(routeIds.length);
    expect(shortlist.every((route) => route.roleId === 'administrative-coordinator')).toBe(true);
  });
});
