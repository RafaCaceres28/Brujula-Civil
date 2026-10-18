import { beforeEach, describe, expect, it, vi } from 'vitest';
import { selectCareerRoute } from './select-career-route';
import { createDomainError, domainFailure, domainSuccess } from '../../../lib/contracts/index';
import { recommendationOutputFixture } from './__fixtures__/recommendation-fixtures';

const mocks = vi.hoisted(() => ({
  overview: vi.fn(),
  profile: vi.fn(),
  resolve: vi.fn(),
  persist: vi.fn(),
}));
vi.mock('../../wizard/server/get-onboarding-overview', () => ({
  getOnboardingOverview: mocks.overview,
}));
vi.mock('../../profile/server/get-profile', () => ({ getProfile: mocks.profile }));
vi.mock('./resolve-recommendation-state', () => ({
  resolveRecommendationState: mocks.resolve,
  persistRecommendationFlow: mocks.persist,
}));

const input = {
  userId: 'user-1',
  recommendationSetId: recommendationOutputFixture.recommendationSetId,
  selectedRouteId: recommendationOutputFixture.routes[0].routeId,
};

describe('selectCareerRoute', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.overview.mockResolvedValue({
      state: { aggregated_draft_jsonb: { employabilityFlow: { custom: { preserved: true } } } },
    });
    mocks.profile.mockResolvedValue(null);
    mocks.resolve.mockResolvedValue(
      domainSuccess({ recommendations: recommendationOutputFixture }),
    );
  });

  it('validates current source before persisting selection, aliases and captured explanation', async () => {
    expect(await selectCareerRoute(input)).toMatchObject({ ok: true, data: inputWithoutUser() });
    expect(mocks.resolve).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', requireCurrentSet: input.recommendationSetId }),
    );
    expect(mocks.persist).toHaveBeenCalledWith(
      'user-1',
      expect.anything(),
      expect.objectContaining({
        custom: { preserved: true },
        selectedRoute: expect.objectContaining(inputWithoutUser()),
        selectedRecommendation: expect.objectContaining(inputWithoutUser()),
        selectedRouteContext: expect.objectContaining({
          ...inputWithoutUser(),
          reasonSummarySnapshot: recommendationOutputFixture.routes[0].explanation!.reasonSummary,
        }),
      }),
      expect.any(String),
    );
  });

  it('rejects route that does not belong to current recommendation set', async () => {
    expect(await selectCareerRoute({ ...input, selectedRouteId: 'not-in-set' })).toMatchObject({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Selected route does not belong to active recommendation set',
      },
    });
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it('preserves source/gate rejection without generating or persisting a replacement', async () => {
    const failure = domainFailure(
      createDomainError({
        code: 'VALIDATION_ERROR',
        message: 'Stale set',
        details: { staleExplanationContext: true },
      }),
    );
    mocks.resolve.mockResolvedValue(failure);
    expect(await selectCareerRoute(input)).toEqual(failure);
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it('keeps fallback for a current route with a legacy explanation absent', async () => {
    const output = structuredClone(recommendationOutputFixture);
    delete output.routes[0].explanation;
    output.routes[0].matchedSignals = ['LEGACY_CODE_NOT_MAPPED'];
    mocks.resolve.mockResolvedValue(domainSuccess({ recommendations: output }));
    expect((await selectCareerRoute(input)).ok).toBe(true);
    expect(mocks.persist.mock.calls[0][2].selectedRouteContext).toMatchObject({
      fitLabelSnapshot: 'exploratorio',
      guidanceSnapshot: 'Usa esta ruta como referencia inicial mientras reunes mas contexto.',
    });
  });

  it.each(['CONFLICT', 'EXTERNAL_DEPENDENCY_ERROR'] as const)(
    'does not report successful selection after persistence %s',
    async (code) => {
      mocks.persist.mockRejectedValue(
        createDomainError({ code, message: 'Safe storage failure', retryable: true }),
      );
      expect(await selectCareerRoute(input)).toMatchObject({ ok: false, error: { code } });
    },
  );

  it('does not expose raw profile failures', async () => {
    mocks.profile.mockRejectedValue(new Error('private profile error'));
    const result = await selectCareerRoute(input);
    expect(result).toMatchObject({ ok: false, error: { code: 'INTERNAL_ERROR' } });
    expect(JSON.stringify(result)).not.toContain('private profile');
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it('validates boundary input before reads', async () => {
    expect(await selectCareerRoute({ userId: 'user-1' })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(mocks.overview).not.toHaveBeenCalled();
  });
});

function inputWithoutUser() {
  return { recommendationSetId: input.recommendationSetId, selectedRouteId: input.selectedRouteId };
}
