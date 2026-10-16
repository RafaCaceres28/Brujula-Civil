import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppLayout from '../layout';
import ProfessionalExperiencePage from './page';

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  bootstrap: vi.fn(),
  profile: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`REDIRECT:${destination}`);
  }),
}));

vi.mock('@/features/auth/server/get-current-user', () => ({ getCurrentUser: mocks.currentUser }));
vi.mock('@/features/profile/server/ensure-user-bootstrap', () => ({
  ensureUserBootstrap: mocks.bootstrap,
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/features/profile/server/get-profile', () => ({ getProfile: mocks.profile }));

beforeEach(() => {
  mocks.currentUser.mockResolvedValue({ id: 'local-user' });
  mocks.bootstrap.mockResolvedValue(undefined);
  mocks.profile.mockResolvedValue({});
});

describe('/experiencia-profesional', () => {
  it('carga el historial canónico autenticado sin duplicar bootstrap', async () => {
    const html = renderToString(await ProfessionalExperiencePage());
    expect(html).toContain('Experiencia profesional');
    expect(html).toContain('Todavía no tienes experiencias guardadas');
    expect(html).toContain('Añadir experiencia');
    expect(mocks.profile).toHaveBeenCalledExactlyOnceWith('local-user');
    expect(mocks.bootstrap).not.toHaveBeenCalled();
  });

  it('hereda el layout autenticado existente, con su bootstrap y navegación sin cambios', async () => {
    const element = await AppLayout({ children: await ProfessionalExperiencePage() });
    const html = renderToString(element);
    expect(mocks.currentUser).toHaveBeenCalled();
    expect(mocks.bootstrap).toHaveBeenCalledExactlyOnceWith('local-user');
    expect(html).toContain('<main');
    expect(html).toContain('Panel de usuario');
    expect(html).toContain('Experiencia profesional');
    expect(html).toContain('href="/onboarding"');
    expect(html).not.toContain('href="/experiencia-profesional"');
  });

  it('redirige al login sin ejecutar bootstrap si no hay sesión', async () => {
    mocks.currentUser.mockResolvedValue(null);
    await expect(ProfessionalExperiencePage()).rejects.toThrow('REDIRECT:/login');
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith('/login');
    expect(mocks.bootstrap).not.toHaveBeenCalled();
  });

  it('renderiza experiencias guardadas reales como etiquetas en SSR', async () => {
    mocks.profile.mockResolvedValue({
      careerHistory: {
        experiences: [
          { id: 'experience-one', activity: 'analysis' },
          { id: 'experience-two', activity: 'execution' },
        ],
      },
    });
    const html = renderToString(await ProfessionalExperiencePage());
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(document.querySelector('[aria-label="Editar experiencia: Análisis"]')?.textContent).toBe(
      'Editar',
    );
    expect(
      document.querySelector('[aria-label="Editar experiencia: Ejecución operativa"]')?.textContent,
    ).toBe('Editar');
    expect(html).not.toContain('<form');
  });

  it.each(['throw', 'null'])(
    'no trata lectura %s como historial vacío ni habilita editor',
    async (kind) => {
      if (kind === 'throw') mocks.profile.mockRejectedValue(new Error('provider private error'));
      else mocks.profile.mockResolvedValue(null);
      const html = renderToString(await ProfessionalExperiencePage());
      expect(html).toContain('role="alert"');
      expect(html).toContain('Reintentar lectura');
      expect(html).not.toContain('Añadir experiencia');
      expect(html).not.toContain('Todavía no tienes');
      expect(html).not.toContain('provider private error');
    },
  );
});
