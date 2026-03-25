import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCareerRoutesAction } from './get-career-routes-action';

const {
  requireUserMock,
  getOnboardingOverviewMock,
  buildRecommendationInputMock,
  generateCareerRoutesMock,
} = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  getOnboardingOverviewMock: vi.fn(),
  buildRecommendationInputMock: vi.fn(),
  generateCareerRoutesMock: vi.fn(),
}));

vi.mock('@/features/auth/server/require-user', () => ({
  requireUser: requireUserMock,
}));

vi.mock('../../wizard/server/get-onboarding-overview', () => ({
  getOnboardingOverview: getOnboardingOverviewMock,
}));

vi.mock('../services/build-recommendation-input', () => ({
  buildRecommendationInput: buildRecommendationInputMock,
}));

vi.mock('../server/generate-career-routes', () => ({
  generateCareerRoutes: generateCareerRoutesMock,
}));

describe('getCareerRoutesAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds snapshot from wizard and delegates shortlist generation', async () => {
    const now = new Date('2026-03-25T01:02:03.000Z');
    const overview = {
      draft: {
        militar: {
          branch: 'army',
        },
      },
      employabilityFlow: {
        profileSnapshotId: 'profile-snapshot-user-1',
      },
    };

    requireUserMock.mockResolvedValueOnce({ id: 'user-1' });
    getOnboardingOverviewMock.mockResolvedValueOnce(overview);
    buildRecommendationInputMock.mockReturnValueOnce({
      snapshotId: 'wizard-profile-snapshot-user-1',
    });
    generateCareerRoutesMock.mockReturnValueOnce({
      ok: true,
      data: {
        recommendationSetId: 'recset-wizard-profile-snapshot-user-1-20260325010203',
        generatedAt: now.toISOString(),
        sourceSnapshotId: 'wizard-profile-snapshot-user-1',
        routes: [
          {
            routeId: 'route-project-manager-logistics-mid',
            roleId: 'project-manager',
            sectorId: 'logistics',
            reasonSummary: 'Your profile aligns with operational planning transferability.',
            matchedSignals: ['TARGET_ROLE_HINT'],
            explanation: {
              reasonSummary: 'Your profile aligns with operational planning transferability.',
              fitLabel: 'alto',
              fitScore: 89,
              explanationKeywords: ['planning', 'leadership'],
              decisionGuidance:
                'Prioritize this route if you want near-term leadership continuity.',
            },
          },
          {
            routeId: 'route-operations-coordinator-logistics-mid',
            roleId: 'operations-coordinator',
            sectorId: 'logistics',
            reasonSummary: 'Your profile aligns with coordination and logistics operations.',
            matchedSignals: ['TARGET_SECTOR_HINT'],
            explanation: {
              reasonSummary: 'Your profile aligns with coordination and logistics operations.',
              fitLabel: 'medio',
              fitScore: 67,
              explanationKeywords: ['coordination', 'logistics'],
              decisionGuidance:
                'Compare it if you prefer execution-heavy operational coordination.',
            },
          },
          {
            routeId: 'route-team-lead-technology-mid',
            roleId: 'team-lead',
            sectorId: 'technology',
            reasonSummary: 'Your profile aligns with leadership and systems collaboration.',
            matchedSignals: ['LEADERSHIP_MATCH'],
            explanation: {
              reasonSummary: 'Your profile aligns with leadership and systems collaboration.',
              fitLabel: 'medio',
              fitScore: 61,
              explanationKeywords: ['leadership', 'systems'],
              decisionGuidance:
                'Use this route if you want to move toward cross-functional tech teams.',
            },
          },
        ],
      },
      meta: {
        timestamp: now.toISOString(),
        source: 'recs.server.generate-routes',
      },
    });

    const result = await getCareerRoutesAction({
      requestId: 'req-us1-1',
      now,
    });

    expect(requireUserMock).toHaveBeenCalledTimes(1);
    expect(getOnboardingOverviewMock).toHaveBeenCalledWith('user-1');
    expect(buildRecommendationInputMock).toHaveBeenCalledWith({
      userId: 'user-1',
      overview,
    });
    expect(generateCareerRoutesMock).toHaveBeenCalledWith(
      { snapshotId: 'wizard-profile-snapshot-user-1' },
      {
        requestId: 'req-us1-1',
        now,
      },
    );
    expect(result.ok).toBe(true);
  });

  it('returns safe internal error when loading profile context fails', async () => {
    const now = new Date('2026-03-25T01:05:00.000Z');

    requireUserMock.mockRejectedValueOnce(new Error('database timeout: supabase unavailable'));

    const result = await getCareerRoutesAction({ now });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe('INTERNAL_ERROR');
    expect(result.error.message).toBe(
      'Unable to load structured profile for career recommendations',
    );
    expect(result.error.message).not.toContain('supabase');
  });
});
