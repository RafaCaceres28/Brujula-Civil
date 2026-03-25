import { beforeEach, describe, expect, it, vi } from 'vitest';
import { selectCareerRouteAction } from './select-career-route-action';

const { requireUserMock, selectCareerRouteMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  selectCareerRouteMock: vi.fn(),
}));

vi.mock('@/features/auth/server/require-user', () => ({
  requireUser: requireUserMock,
}));

vi.mock('../server/select-career-route', () => ({
  selectCareerRoute: selectCareerRouteMock,
}));

describe('selectCareerRouteAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates input and delegates selection to the server boundary', async () => {
    requireUserMock.mockResolvedValueOnce({ id: 'user-1' });
    selectCareerRouteMock.mockResolvedValueOnce({
      ok: true,
      data: {
        recommendationSetId: 'recset-snapshot-1-20260324010101',
        selectedRouteId: 'route-operations-coordinator-logistics-mid',
        selectedAt: '2026-03-25T05:10:00.000Z',
      },
      meta: {
        timestamp: '2026-03-25T05:10:00.000Z',
        source: 'recs.server.select-route',
      },
    });

    const result = await selectCareerRouteAction({
      recommendationSetId: 'recset-snapshot-1-20260324010101',
      selectedRouteId: 'route-operations-coordinator-logistics-mid',
      requestId: 'req-us2-1',
    });

    expect(requireUserMock).toHaveBeenCalledTimes(1);
    expect(selectCareerRouteMock).toHaveBeenCalledWith({
      userId: 'user-1',
      recommendationSetId: 'recset-snapshot-1-20260324010101',
      selectedRouteId: 'route-operations-coordinator-logistics-mid',
      requestId: 'req-us2-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.selectedRouteId).toBe('route-operations-coordinator-logistics-mid');
    expect(result.meta?.source).toBe('recs.action.select-career-route');
  });

  it('rejects invalid route identifiers before hitting server boundary', async () => {
    const result = await selectCareerRouteAction({
      recommendationSetId: 'recset-snapshot-1-20260324010101',
      selectedRouteId: 'route invalida con espacios',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(selectCareerRouteMock).not.toHaveBeenCalled();
    expect(requireUserMock).not.toHaveBeenCalled();
  });
});
