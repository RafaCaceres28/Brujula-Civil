import { routes } from '../../../lib/constants/routes';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';
import { getCurrentUser } from './get-current-user';
import { redirectIfAuthenticated } from './redirect-if-authenticated';
import { requireUser } from './require-user';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

function createSupabaseMock(
  user: { id: string } | null,
  error: { message?: string; status?: number; code?: string } | null = null,
) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error,
      }),
    },
  };
}

describe('auth guards', () => {
  it('returns user from getCurrentUser when session exists', async () => {
    const client = createSupabaseMock({ id: 'user-1' });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const user = await getCurrentUser();

    expect(user).toEqual({ id: 'user-1' });
  });

  it('returns null from getCurrentUser on expected auth absence', async () => {
    const client = createSupabaseMock(null, { status: 401, code: 'session_not_found' });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const user = await getCurrentUser();

    expect(user).toBeNull();
  });

  it('rethrows structural failures from getCurrentUser', async () => {
    const structuralError = new Error('dynamic api used in invalid context');
    vi.mocked(createClient).mockRejectedValue(structuralError);

    await expect(getCurrentUser()).rejects.toBe(structuralError);
  });

  it('redirects anonymous user to login with redirectedFrom', async () => {
    const client = createSupabaseMock(null);
    vi.mocked(createClient).mockResolvedValue(client as never);

    await requireUser('/dashboard');

    expect(redirect).toHaveBeenCalledWith('/login?redirectedFrom=%2Fdashboard');
  });

  it('propagates structural failures from requireUser without redirecting', async () => {
    const structuralError = new Error('cookies access failure');
    vi.mocked(createClient).mockRejectedValue(structuralError);

    await expect(requireUser('/dashboard')).rejects.toBe(structuralError);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects authenticated users away from auth routes', async () => {
    const client = createSupabaseMock({ id: 'user-1' });
    vi.mocked(createClient).mockResolvedValue(client as never);

    await redirectIfAuthenticated();

    expect(redirect).toHaveBeenCalledWith(routes.app.dashboard);
  });
});
