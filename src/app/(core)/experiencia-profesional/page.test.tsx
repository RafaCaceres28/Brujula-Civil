import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { profileClientFixture } from '@/features/profile/server/profile-client.test-helper';
import CoreLayout from '../layout';
import ProfessionalExperiencePage from './page';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  bootstrap: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`REDIRECT:${destination}`);
  }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/features/profile/server/ensure-user-bootstrap', () => ({
  ensureUserBootstrap: mocks.bootstrap,
}));
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  redirect: mocks.redirect,
}));

let storage: ReturnType<typeof profileClientFixture>;
beforeEach(() => {
  vi.clearAllMocks();
  storage = profileClientFixture();
  storage.rows.user_military_profiles = [];
  storage.rows.user_wizard_state = [];
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  vi.mocked(createClient).mockResolvedValue({
    ...storage.client,
    auth: { getUser: mocks.getUser },
  } as never);
});

describe('/experiencia-profesional con lector y auth reales', () => {
  it.each(['missing_profile', 'missing_history', 'empty_history'])(
    'carga %s sin perfil base ni escrituras',
    async (state) => {
      if (state !== 'missing_profile')
        storage.rows.user_military_profiles.push({
          id: 'mil-1',
          user_id: 'user-1',
          is_current: true,
          raw_profile_jsonb:
            state === 'missing_history' ? {} : { careerHistory: { experiences: [] } },
        });
      const html = renderToString(await ProfessionalExperiencePage());
      expect(html).toContain('Experiencia profesional');
      expect(html).toContain('Todavía no tienes experiencias guardadas');
      expect(html).toContain('Añadir experiencia');
      expect(storage.calls).toEqual([
        {
          table: 'user_military_profiles',
          operation: 'select',
          filters: { user_id: 'user-1', is_current: true },
          payload: undefined,
        },
      ]);
      expect(mocks.bootstrap).not.toHaveBeenCalled();
    },
  );

  it('compone el shell core autenticado sin bootstrap y enlaza a traduccion', async () => {
    const html = renderToString(await CoreLayout({ children: await ProfessionalExperiencePage() }));
    expect(mocks.getUser).toHaveBeenCalled();
    expect(mocks.bootstrap).not.toHaveBeenCalled();
    expect(html.match(/<main/g)).toHaveLength(1);
    expect(html).toContain('Panel de usuario');
    expect(html).toContain('href="/traduccion"');
    expect(html).toContain('Ver propuestas de traducción');
    expect(
      storage.calls.every(
        (call) => call.table === 'user_military_profiles' && call.operation === 'select',
      ),
    ).toBe(true);
  });

  it('redirige al login sin leer ni escribir si no hay sesion', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(ProfessionalExperiencePage()).rejects.toThrow('REDIRECT:/login');
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith('/login');
    expect(mocks.bootstrap).not.toHaveBeenCalled();
    expect(storage.calls).toEqual([]);
  });

  it('renderiza experiencias guardadas como etiquetas en SSR sin perfil base', async () => {
    storage.rows.user_military_profiles.push({
      user_id: 'user-1',
      is_current: true,
      raw_profile_jsonb: {
        careerHistory: {
          experiences: [
            { id: 'experience-one', activity: 'analysis' },
            { id: 'experience-two', activity: 'execution' },
          ],
        },
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

  it.each(['storage', 'corrupt'])('no trata %s como vacio ni habilita editor', async (kind) => {
    if (kind === 'storage')
      storage.control.error = { table: 'user_military_profiles', operation: 'select' };
    else
      storage.rows.user_military_profiles.push({
        user_id: 'user-1',
        is_current: true,
        raw_profile_jsonb: { careerHistory: null },
      });
    const html = renderToString(await ProfessionalExperiencePage());
    expect(html).toContain('role="alert"');
    expect(html).toContain('Reintentar lectura');
    expect(html).not.toContain('Añadir experiencia');
    expect(html).not.toContain('Todavía no tienes');
    expect(html).not.toContain('private provider details');
    expect(storage.calls.every((call) => call.operation === 'select')).toBe(true);
  });
});
