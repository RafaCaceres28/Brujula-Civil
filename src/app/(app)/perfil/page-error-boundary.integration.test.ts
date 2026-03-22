import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PerfilErrorBoundary from './error';
import ProfilePage from './page';

const { getRequiredUserMock, getProfileMock } = vi.hoisted(() => {
  return {
    getRequiredUserMock: vi.fn(),
    getProfileMock: vi.fn(),
  };
});

vi.mock('@/features/auth/server/get-required-user', () => ({
  getRequiredUser: getRequiredUserMock,
}));

vi.mock('@/features/profile/server/get-profile', () => ({
  getProfile: getProfileMock,
}));

vi.mock('../../../features/profile/actions/save-profile-action', () => ({
  saveDraftAction: vi.fn(),
}));

vi.mock('../../../features/profile/actions/submit-profile-action', () => ({
  submitProfileAction: vi.fn(),
}));

vi.mock('@/components/layout/page-shell', () => ({
  PageShell: (props: { children: ReactNode }) => createElement('div', null, props.children),
}));

vi.mock('@/components/layout/section-header', () => ({
  SectionHeader: (props: { title: string; description?: string }) =>
    createElement('header', null, `${props.title}:${props.description ?? ''}`),
}));

vi.mock('@/features/profile/components/profile-summary-card', () => ({
  deriveProfileSummaryVisualState: () => 'vacio',
  ProfileSummaryCard: () => createElement('div', null, 'summary'),
}));

vi.mock('@/features/profile/components/profile-form', () => ({
  ProfileForm: () => createElement('div', null, 'form'),
}));

vi.mock('@/features/profile/services/profile.mapper', () => ({
  PROFILE_SUMMARY_FALLBACKS: {
    fullName: 'Unknown user',
    primaryGoal: 'Goal pending',
    location: 'Location pending',
  },
  mapDomainToProfileSummary: vi.fn(),
  mapDomainToProfileFormInitialValues: vi.fn(),
}));

describe('perfil route integration: getProfile error -> segment boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRequiredUserMock.mockResolvedValue({ id: 'user-1' });
  });

  it('activates error boundary fallback when getProfile throws', async () => {
    const getProfileError = new Error('profile read failed');
    getProfileMock.mockRejectedValue(getProfileError);

    let routeError: Error | null = null;
    try {
      await ProfilePage();
    } catch (error) {
      routeError = error as Error;
    }

    expect(getProfileMock).toHaveBeenCalledWith('user-1');
    expect(routeError).toBe(getProfileError);

    const errorMarkup = renderToStaticMarkup(
      createElement(PerfilErrorBoundary, { error: routeError as Error, reset: vi.fn() }),
    );

    expect(errorMarkup).toContain('No pudimos cargar tu perfil');
    expect(errorMarkup).toContain('Referencia: profile read failed');
  });
});
