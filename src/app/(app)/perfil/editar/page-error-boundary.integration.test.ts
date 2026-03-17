import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PerfilEditarErrorBoundary from './error';
import PerfilEditarPage from './page';

const { getCurrentUserMock, getProfileMock } = vi.hoisted(() => {
  return {
    getCurrentUserMock: vi.fn(),
    getProfileMock: vi.fn(),
  };
});

vi.mock('@/features/auth/server/get-current-user', () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock('@/features/profile/server/get-profile', () => ({
  getProfile: getProfileMock,
}));

vi.mock('../../../../features/profile/actions/save-profile-action', () => ({
  saveDraftAction: vi.fn(),
}));

vi.mock('../../../../features/profile/actions/submit-profile-action', () => ({
  submitProfileAction: vi.fn(),
}));

vi.mock('@/components/layout/page-shell', () => ({
  PageShell: (props: { children: ReactNode }) => createElement('div', null, props.children),
}));

vi.mock('@/components/layout/section-header', () => ({
  SectionHeader: (props: { title: string; description?: string }) =>
    createElement('header', null, `${props.title}:${props.description ?? ''}`),
}));

vi.mock('next/link', () => ({
  default: (props: { href: string; children: ReactNode }) =>
    createElement('a', { href: props.href }, props.children),
}));

vi.mock('@/features/profile/components/profile-form', () => ({
  ProfileForm: () => createElement('div', null, 'form'),
}));

vi.mock('@/features/profile/services/profile.mapper', () => ({
  mapDomainToProfileFormInitialValues: vi.fn(),
}));

describe('perfil/editar route integration: getProfile error -> segment boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 'user-1' });
  });

  it('activates error boundary fallback when getProfile throws', async () => {
    const getProfileError = new Error('profile edit read failed');
    getProfileMock.mockRejectedValue(getProfileError);

    let routeError: Error | null = null;
    try {
      await PerfilEditarPage();
    } catch (error) {
      routeError = error as Error;
    }

    expect(getProfileMock).toHaveBeenCalledWith('user-1');
    expect(routeError).toBe(getProfileError);

    const errorMarkup = renderToStaticMarkup(
      createElement(PerfilEditarErrorBoundary, { error: routeError as Error, reset: vi.fn() }),
    );

    expect(errorMarkup).toContain('No pudimos cargar el editor de perfil');
    expect(errorMarkup).toContain('Referencia: profile edit read failed');
  });
});
