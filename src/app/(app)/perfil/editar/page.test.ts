import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileReadOutput } from '@/features/profile/types/profile.types';
import PerfilEditarPage from './page';
import { getRequiredUser } from '@/features/auth/server/get-required-user';
import { getProfile } from '@/features/profile/server/get-profile';
import { mapDomainToProfileFormInitialValues } from '@/features/profile/services/profile.mapper';

const profileFormSpy = vi.fn();

vi.mock('@/components/layout/page-shell', () => ({
  PageShell: (props: { children: ReactNode }) => createElement('div', null, props.children),
}));

vi.mock('@/components/layout/section-header', () => ({
  SectionHeader: (props: { title: string; description?: string }) =>
    createElement('header', null, `${props.title}:${props.description ?? ''}`),
}));

vi.mock('next/link', () => ({
  default: (props: { href: string; children: ReactNode; className?: string }) =>
    createElement('a', { href: props.href, className: props.className }, props.children),
}));

vi.mock('@/features/auth/server/get-required-user', () => ({
  getRequiredUser: vi.fn(),
}));

vi.mock('@/features/profile/server/get-profile', () => ({
  getProfile: vi.fn(),
}));

vi.mock('../../../../features/profile/actions/save-profile-action', () => ({
  saveDraftAction: vi.fn(),
}));

vi.mock('../../../../features/profile/actions/submit-profile-action', () => ({
  submitProfileAction: vi.fn(),
}));

vi.mock('@/features/profile/services/profile.mapper', () => ({
  mapDomainToProfileFormInitialValues: vi.fn(),
}));

vi.mock('@/features/profile/components/profile-form', () => ({
  ProfileForm: (props: { userId: string; initialValues?: Record<string, unknown> }) => {
    profileFormSpy(props);
    return createElement('div', { 'data-testid': 'profile-form' }, 'form');
  },
}));

const FULL_PROFILE: ProfileReadOutput = {
  userId: 'user-1',
  profile: {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: null,
    city: 'Madrid',
  },
  militaryBackground: {
    rank: 'Captain',
    area: 'Signals',
    yearsOfService: 12,
    summary: 'Ops',
  },
  civilianTarget: {
    targetRole: 'Operations Manager',
    targetSector: 'Logistics',
    locationPreference: 'Remote',
  },
};

describe('perfil/editar/page SSR composition', () => {
  beforeEach(() => {
    profileFormSpy.mockReset();
    vi.mocked(getRequiredUser).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(mapDomainToProfileFormInitialValues).mockReturnValue({
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '',
        city: 'Madrid',
      },
      militaryBackground: {
        rank: 'Captain',
        area: 'Signals',
        yearsOfService: '12',
        summary: 'Ops',
      },
      civilianTarget: {
        targetRole: 'Operations Manager',
        targetSector: 'Logistics',
        locationPreference: 'Remote',
      },
    });
  });

  it('loads profile via SSR and renders form with mapped values', async () => {
    vi.mocked(getProfile).mockResolvedValue(FULL_PROFILE);

    const element = await PerfilEditarPage();
    const html = renderToStaticMarkup(element);

    expect(getProfile).toHaveBeenCalledWith('user-1');
    expect(mapDomainToProfileFormInitialValues).toHaveBeenCalledWith(FULL_PROFILE);
    expect(profileFormSpy).toHaveBeenCalledWith({
      userId: 'user-1',
      initialValues: {
        profile: {
          fullName: 'Ada Lovelace',
          email: 'ada@example.com',
          phone: '',
          city: 'Madrid',
        },
        militaryBackground: {
          rank: 'Captain',
          area: 'Signals',
          yearsOfService: '12',
          summary: 'Ops',
        },
        civilianTarget: {
          targetRole: 'Operations Manager',
          targetSector: 'Logistics',
          locationPreference: 'Remote',
        },
      },
      saveDraft: expect.any(Function),
      submitProfile: expect.any(Function),
    });
    expect(html).toContain('Volver a perfil');
    expect(html).toContain('href="/perfil"');
  });

  it('renders explicit empty state and keeps form enabled with empty defaults', async () => {
    vi.mocked(getProfile).mockResolvedValue(null);

    const element = await PerfilEditarPage();
    const html = renderToStaticMarkup(element);

    expect(mapDomainToProfileFormInitialValues).not.toHaveBeenCalled();
    expect(profileFormSpy).toHaveBeenCalledWith({
      userId: 'user-1',
      initialValues: undefined,
      saveDraft: expect.any(Function),
      submitProfile: expect.any(Function),
    });
    expect(html).toContain('Aun no encontramos un perfil guardado.');
  });

  it('preserves redirect flow from single auth authority without local hard-fail throws', async () => {
    const redirectSignal = new Error('NEXT_REDIRECT');
    vi.mocked(getRequiredUser).mockRejectedValue(redirectSignal);

    await expect(PerfilEditarPage()).rejects.toBe(redirectSignal);
    expect(getProfile).not.toHaveBeenCalled();
  });
});
