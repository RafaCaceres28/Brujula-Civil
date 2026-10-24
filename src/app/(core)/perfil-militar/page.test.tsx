import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequiredUser } from '@/features/auth/server/get-required-user';
import { readMilitaryBasics } from '@/features/profile/server/military-basics';
import MilitaryProfilePage from './page';

vi.mock('@/features/auth/server/get-required-user', () => ({ getRequiredUser: vi.fn() }));
vi.mock('@/features/profile/server/military-basics', () => ({ readMilitaryBasics: vi.fn() }));
vi.mock('@/features/profile/actions/save-military-basics-action', () => ({
  saveMilitaryBasicsAction: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRequiredUser).mockResolvedValue({ id: 'user-1' } as never);
});

describe('/perfil-militar', () => {
  it('renders an absent profile without fabricated data and links to core pages', async () => {
    vi.mocked(readMilitaryBasics).mockResolvedValue({ ok: true, data: null });
    const html = renderToString(await MilitaryProfilePage());
    expect(getRequiredUser).toHaveBeenCalledWith('/perfil-militar');
    expect(readMilitaryBasics).toHaveBeenCalledExactlyOnceWith('user-1');
    expect(html).toContain('Guardar perfil militar');
    expect(html).toContain('href="/experiencia-profesional"');
    expect(html).toContain('href="/traduccion"');
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(
      Array.from(document.querySelectorAll('select')).every((select) => select.value === ''),
    ).toBe(true);
  });
  it('shows saved values after a fresh read', async () => {
    vi.mocked(readMilitaryBasics).mockResolvedValue({
      ok: true,
      data: {
        id: 'mil-1',
        branch: 'army',
        rank_text: 'Soldado',
        specialty_text: 'Mantenimiento',
        service_years: 0,
      },
    });
    const html = renderToString(await MilitaryProfilePage());
    expect(html).toContain('value="Soldado" selected');
    expect(html).toContain('value="0"');
  });
  it('does not expose an editable blank form on a read failure', async () => {
    vi.mocked(readMilitaryBasics).mockResolvedValue({
      ok: false,
      error: { code: 'EXTERNAL_DEPENDENCY_ERROR', message: 'Recarga para reintentar.' },
    });
    const html = renderToString(await MilitaryProfilePage());
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('<form');
  });
  it('does not read without authentication', async () => {
    vi.mocked(getRequiredUser).mockRejectedValue(new Error('REDIRECT:/login'));
    await expect(MilitaryProfilePage()).rejects.toThrow('REDIRECT:/login');
    expect(readMilitaryBasics).not.toHaveBeenCalled();
  });
});
