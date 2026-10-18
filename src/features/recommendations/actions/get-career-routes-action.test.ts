import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCareerRoutesAction } from './get-career-routes-action';
import { createDomainError, domainFailure, domainSuccess } from '../../../lib/contracts';
import { recommendationOutputFixture } from '../server/__fixtures__/recommendation-fixtures';

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  overview: vi.fn(),
  profile: vi.fn(),
  resolve: vi.fn(),
}));
vi.mock('@/features/auth/server/require-user', () => ({ requireUser: mocks.user }));
vi.mock('../../wizard/server/get-onboarding-overview', () => ({
  getOnboardingOverview: mocks.overview,
}));
vi.mock('../../profile/server/get-profile', () => ({ getProfile: mocks.profile }));
vi.mock('../server/resolve-recommendation-state', () => ({
  resolveRecommendationState: mocks.resolve,
}));

describe('getCareerRoutesAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: 'user-1' });
    mocks.profile.mockResolvedValue(null);
    mocks.overview.mockResolvedValue({ state: null });
  });

  it('delegates validation, reuse and persistence with the authenticated context read once', async () => {
    const now = new Date('2026-03-25T01:02:03.000Z');
    const meta = { timestamp: now.toISOString(), source: 'recs.server.resolve-state' };
    mocks.resolve.mockResolvedValue(
      domainSuccess({ recommendations: recommendationOutputFixture }, meta),
    );
    expect(await getCareerRoutesAction({ now, requestId: 'req-1' })).toEqual(
      domainSuccess(recommendationOutputFixture, meta),
    );
    expect(mocks.user).toHaveBeenCalledTimes(1);
    expect(mocks.profile).toHaveBeenCalledExactlyOnceWith('user-1');
    expect(mocks.overview).toHaveBeenCalledExactlyOnceWith('user-1');
    expect(mocks.resolve).toHaveBeenCalledExactlyOnceWith({
      userId: 'user-1',
      overview: { state: null },
      profile: null,
      now,
      requestId: 'req-1',
    });
  });

  it.each(['VALIDATION_ERROR', 'CONFLICT', 'INTERNAL_ERROR', 'EXTERNAL_DEPENDENCY_ERROR'] as const)(
    'preserves resolver failure %s without returning old recommendations',
    async (code) => {
      const failure = domainFailure(createDomainError({ code, message: 'Safe resolver failure' }));
      mocks.resolve.mockResolvedValue(failure);
      expect(await getCareerRoutesAction()).toEqual(failure);
    },
  );

  it('returns safe internal error when loading profile context fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.user.mockRejectedValue(new Error('private database failure'));
    const result = await getCareerRoutesAction();
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unable to load structured profile for career recommendations',
        retryable: false,
      },
    });
    expect(JSON.stringify(result)).not.toContain('private database failure');
    expect(log).toHaveBeenCalledExactlyOnceWith(
      'Career routes action: unexpected context or generation failure',
    );
  });

  it('preserves expected dependency failures without logging an unexpected exception', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = createDomainError({
      code: 'EXTERNAL_DEPENDENCY_ERROR',
      message: 'Service temporarily unavailable',
      retryable: true,
    });
    mocks.overview.mockRejectedValue(error);
    expect(await getCareerRoutesAction()).toMatchObject({ ok: false, error });
    expect(log).not.toHaveBeenCalled();
    expect(mocks.resolve).not.toHaveBeenCalled();
  });

  it('does not resolve or fall back when the canonical profile read fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.profile.mockRejectedValue(new Error('private profile integrity failure'));
    const result = await getCareerRoutesAction();
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR', retryable: false },
    });
    expect(JSON.stringify(result)).not.toContain('private profile');
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
});
