import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequiredUser } from '@/features/auth/server/get-required-user';
import { readAcademicEducation } from '@/features/profile/server/academic-education';
import FormationPage from './page';

vi.mock('@/features/auth/server/get-required-user', () => ({ getRequiredUser: vi.fn() }));
vi.mock('@/features/profile/server/academic-education', () => ({ readAcademicEducation: vi.fn() }));
vi.mock('@/features/profile/actions/save-academic-education-action', () => ({
  saveAcademicEducationAction: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRequiredUser).mockResolvedValue({ id: 'owner' } as never);
});
describe('/formacion', () => {
  it('authenticates and reads only the owner, with direct navigation', async () => {
    vi.mocked(readAcademicEducation).mockResolvedValue({ ok: true, data: null });
    const html = renderToStaticMarkup(await FormationPage());
    expect(getRequiredUser).toHaveBeenCalledExactlyOnceWith('/formacion');
    expect(readAcademicEducation).toHaveBeenCalledExactlyOnceWith('owner');
    expect(html).toContain('Formación académica');
    expect(html).toContain('Añadir estudios');
    expect(html).toContain('href="/cv-borrador"');
    expect(html).toContain('href="/perfil-profesional"');
  });
  it('blocks editing on read failure instead of replacing corrupt data with empty', async () => {
    vi.mocked(readAcademicEducation).mockResolvedValue({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'No se pudo comprobar la formación.' },
    });
    const html = renderToStaticMarkup(await FormationPage());
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('Añadir estudios');
    expect(html).not.toContain('<form');
  });
});
