import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppLayout from '../layout';
import ProfessionalExperiencePage from './page';

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  bootstrap: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`REDIRECT:${destination}`);
  }),
}));

vi.mock('@/features/auth/server/get-current-user', () => ({ getCurrentUser: mocks.currentUser }));
vi.mock('@/features/profile/server/ensure-user-bootstrap', () => ({
  ensureUserBootstrap: mocks.bootstrap,
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

beforeEach(() => {
  mocks.currentUser.mockResolvedValue({ id: 'local-user' });
  mocks.bootstrap.mockResolvedValue(undefined);
});

describe('/experiencia-profesional', () => {
  it('renderiza el wrapper servidor y el formulario real sin cargar datos de perfil', () => {
    const html = renderToString(<ProfessionalExperiencePage />);
    expect(html).toContain('Experiencia profesional');
    expect(html).toContain('Revisar experiencia');
    expect(html).toContain('Esta es una vista previa. Todavía no se ha guardado en tu perfil');
    expect(mocks.currentUser).not.toHaveBeenCalled();
    expect(mocks.bootstrap).not.toHaveBeenCalled();
  });

  it('hereda el layout autenticado existente, con su bootstrap y navegación sin cambios', async () => {
    const element = await AppLayout({ children: <ProfessionalExperiencePage /> });
    const html = renderToString(element);
    expect(mocks.currentUser).toHaveBeenCalledTimes(1);
    expect(mocks.bootstrap).toHaveBeenCalledExactlyOnceWith('local-user');
    expect(html).toContain('<main');
    expect(html).toContain('Panel de usuario');
    expect(html).toContain('Experiencia profesional');
    expect(html).toContain('href="/onboarding"');
    expect(html).not.toContain('href="/experiencia-profesional"');
  });

  it('redirige al login sin ejecutar bootstrap si no hay sesión', async () => {
    mocks.currentUser.mockResolvedValue(null);
    await expect(AppLayout({ children: <ProfessionalExperiencePage /> })).rejects.toThrow(
      'REDIRECT:/login',
    );
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith('/login');
    expect(mocks.bootstrap).not.toHaveBeenCalled();
  });
});
