import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { onboardingDraftSchema } from '@/features/wizard/schemas/wizard.schema';
import ExperienciaStepPage from './page';

const mocks = vi.hoisted(() => ({ user: vi.fn(), overview: vi.fn(), profile: vi.fn() }));
vi.mock('@/features/auth/server/require-user', () => ({ requireUser: mocks.user }));
vi.mock('@/features/wizard/server/get-onboarding-overview', () => ({
  getOnboardingOverview: mocks.overview,
}));
vi.mock('@/features/profile/server/get-profile', () => ({ getProfile: mocks.profile }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  unstable_rethrow: (error: { digest?: string }) => {
    if (error.digest) throw error;
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: 'user-1' });
  mocks.overview.mockResolvedValue({ state: null, draft: onboardingDraftSchema.parse({}) });
  mocks.profile.mockResolvedValue({
    careerHistory: { experiences: [{ id: 'e1', activity: 'analysis' }] },
  });
});

describe('onboarding experiencia', () => {
  it('carga historial canonico autenticado y complementarios sin captura global duplicada', async () => {
    const html = renderToString(await ExperienciaStepPage());
    expect(mocks.profile).toHaveBeenCalledExactlyOnceWith('user-1');
    expect(html).toContain('Editar experiencia: Análisis');
    expect(html).not.toContain('name="functionTypes"');
    for (const field of [
      'responsibilityAreas',
      'missionTypes',
      'tools',
      'leadershipScopes',
      'achievements',
      'additionalContext',
    ]) {
      expect(html).toContain(`name="${field}"`);
    }
    expect(html).toContain('<details');
  });

  it('permite continuar con historial ausente sin inventar registros', async () => {
    mocks.profile.mockResolvedValue({});
    const doc = new DOMParser().parseFromString(
      renderToString(await ExperienciaStepPage()),
      'text/html',
    );
    expect(doc.body.textContent).toContain('Todavía no tienes experiencias guardadas');
    expect(doc.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(false);
    expect(doc.querySelector('form form')).toBeNull();
  });

  it.each(['error', 'missing'])(
    'bloquea continuar tras lectura %s, sin fingir vacio',
    async (kind) => {
      if (kind === 'error') mocks.profile.mockRejectedValue(new Error('private provider'));
      else mocks.profile.mockResolvedValue(null);
      const doc = new DOMParser().parseFromString(
        renderToString(await ExperienciaStepPage()),
        'text/html',
      );
      expect(doc.body.textContent).toContain('Reintentar lectura');
      expect(doc.body.textContent).not.toContain('Todavía no tienes');
      expect(doc.body.textContent).not.toContain('private provider');
      expect(doc.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(true);
    },
  );
});
