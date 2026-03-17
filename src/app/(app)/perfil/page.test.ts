import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileReadOutput } from '@/features/profile/types/profile.types';
import ProfilePage from './page';
import { getCurrentUser } from '@/features/auth/server/get-current-user';
import { getProfile } from '@/features/profile/server/get-profile';

const profileSummaryCardSpy = vi.fn();
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

vi.mock('@/features/auth/server/get-current-user', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/features/profile/server/get-profile', () => ({
  getProfile: vi.fn(),
}));

vi.mock('@/features/profile/services/profile.mapper', () => ({
  PROFILE_SUMMARY_FALLBACKS: {
    fullName: 'Unknown user',
    primaryGoal: 'Goal pending',
    location: 'Location pending',
  },
  mapDomainToProfileSummary: (profile: ProfileReadOutput) => ({
    fullName: profile.profile.fullName,
    primaryGoal: profile.civilianTarget.targetRole ?? 'Goal pending',
    location: profile.civilianTarget.locationPreference ?? 'Location pending',
  }),
  mapDomainToProfileFormInitialValues: (profile: ProfileReadOutput) => ({
    profile: {
      fullName: profile.profile.fullName,
      email: profile.profile.email,
      phone: profile.profile.phone ?? '',
      city: profile.profile.city ?? '',
    },
    militaryBackground: {
      rank: profile.militaryBackground.rank ?? '',
      area: profile.militaryBackground.area ?? '',
      yearsOfService:
        profile.militaryBackground.yearsOfService === null
          ? ''
          : String(profile.militaryBackground.yearsOfService),
      summary: profile.militaryBackground.summary ?? '',
    },
    civilianTarget: {
      targetRole: profile.civilianTarget.targetRole ?? '',
      targetSector: profile.civilianTarget.targetSector ?? '',
      locationPreference: profile.civilianTarget.locationPreference ?? '',
    },
  }),
}));

vi.mock('@/features/profile/components/profile-summary-card', () => {
  const FALLBACKS = {
    fullName: 'Unknown user',
    primaryGoal: 'Goal pending',
    location: 'Location pending',
  };

  return {
    deriveProfileSummaryVisualState: (summary: {
      fullName: string;
      primaryGoal: string;
      location: string;
    }) => {
      const fields = [summary.fullName, summary.primaryGoal, summary.location];
      const fallbackValues = [FALLBACKS.fullName, FALLBACKS.primaryGoal, FALLBACKS.location];
      const completeFields = fields.filter(
        (field, index) => field !== fallbackValues[index],
      ).length;

      if (completeFields === 0) {
        return 'vacio';
      }

      if (completeFields === 3) {
        return 'completo';
      }

      return 'parcial';
    },
    ProfileSummaryCard: (props: { summary: unknown; state?: string }) => {
      profileSummaryCardSpy(props);
      return createElement('div', { 'data-testid': 'summary-card' }, 'summary');
    },
  };
});

vi.mock('@/features/profile/components/profile-form', () => ({
  ProfileForm: (props: {
    userId: string;
    initialValues?: Record<string, unknown>;
    saveDraft?: unknown;
    submitProfile?: unknown;
  }) => {
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

describe('perfil/page SSR composition', () => {
  beforeEach(() => {
    profileSummaryCardSpy.mockReset();
    profileFormSpy.mockReset();
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never);
  });

  it('loads profile via SSR and composes summary + form with mapped values', async () => {
    vi.mocked(getProfile).mockResolvedValue(FULL_PROFILE);

    const element = await ProfilePage();
    const html = renderToStaticMarkup(element);

    expect(getProfile).toHaveBeenCalledWith('user-1');

    expect(profileSummaryCardSpy).toHaveBeenCalledWith({
      summary: {
        fullName: 'Ada Lovelace',
        primaryGoal: 'Operations Manager',
        location: 'Remote',
      },
      state: 'completo',
    });

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
    });

    expect(html).toContain('Ir a editar perfil');
    expect(html).toContain('href="/perfil/editar"');
  });

  it('renders empty-safe composition when there is no persisted profile', async () => {
    vi.mocked(getProfile).mockResolvedValue(null);

    const element = await ProfilePage();
    renderToStaticMarkup(element);

    expect(profileSummaryCardSpy).toHaveBeenCalledWith({
      summary: {
        fullName: 'Unknown user',
        primaryGoal: 'Goal pending',
        location: 'Location pending',
      },
      state: 'vacio',
    });

    expect(profileFormSpy).toHaveBeenCalledWith({
      userId: 'user-1',
      initialValues: undefined,
    });
  });

  it('renders partial summary state for partially completed profile', async () => {
    vi.mocked(getProfile).mockResolvedValue({
      ...FULL_PROFILE,
      civilianTarget: {
        ...FULL_PROFILE.civilianTarget,
        targetRole: null,
      },
    });

    const element = await ProfilePage();
    renderToStaticMarkup(element);

    expect(profileSummaryCardSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'parcial',
      }),
    );
  });

  it('fails closed when authenticated user is missing despite app layout guard', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    await expect(ProfilePage()).rejects.toThrow(
      'Perfil page requires authenticated user from (app)/layout guard.',
    );
    expect(getProfile).not.toHaveBeenCalled();
  });
});
