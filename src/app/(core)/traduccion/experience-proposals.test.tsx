// @vitest-environment node
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readCareerHistory } from '@/features/profile/server/read-career-history';
import * as builder from '@/features/translation/services/experience-proposals.builder';
import CoreLayout from '../layout';
import TranslationPage from './page';
import TranslationLoadingPage from './loading';

const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  auth: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  read: vi.fn(),
  insert: vi.fn(),
  upsert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  bootstrap: vi.fn(),
  profile: vi.fn(),
  overview: vi.fn(),
  recommendations: vi.fn(),
  translation: vi.fn(),
  generateTranslation: vi.fn(),
  cv: vi.fn(),
  links: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.client }));
vi.mock('@/features/profile/server/ensure-user-bootstrap', () => ({
  ensureUserBootstrap: mocks.bootstrap,
}));
vi.mock('@/features/profile/server/get-profile', () => ({ getProfile: mocks.profile }));
vi.mock('@/features/wizard/server/get-onboarding-overview', () => ({
  getOnboardingOverview: mocks.overview,
}));
vi.mock('@/features/recommendations/server/resolve-recommendation-state', () => ({
  resolveRecommendationState: mocks.recommendations,
}));
vi.mock('@/features/translation/server/get-translation', () => ({
  getTranslation: mocks.translation,
}));
vi.mock('@/features/translation/server/generate-translation', () => ({
  generateTranslation: mocks.generateTranslation,
}));
vi.mock('@/features/cv/server/generate-cv', () => ({ generateCv: mocks.cv }));
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch,
  }: {
    children: ReactNode;
    href: string;
    prefetch?: false;
  }) => {
    mocks.links({ href, prefetch });
    return <a href={href}>{children}</a>;
  },
}));

const history = {
  experiences: [
    { id: 'saved-training', activity: 'technical_instruction', participation: ['instructed'] },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ data: { user: { id: 'authenticated-user' } }, error: null });
  mocks.read.mockResolvedValue({
    data: { raw_profile_jsonb: { careerHistory: history } },
    error: null,
  });
  const query = {
    select: mocks.select,
    eq: mocks.eq,
    maybeSingle: mocks.read,
    insert: mocks.insert,
    upsert: mocks.upsert,
    update: mocks.update,
    delete: mocks.delete,
  };
  mocks.from.mockReturnValue(query);
  mocks.select.mockReturnValue(query);
  mocks.eq.mockReturnValue(query);
  mocks.client.mockResolvedValue({ auth: { getUser: mocks.auth }, from: mocks.from });
});

async function renderPage() {
  const page = await TranslationPage();
  return renderToStaticMarkup(await CoreLayout({ children: page }));
}

function expectReadOnlyCore() {
  expect(mocks.from.mock.calls).toEqual([['user_military_profiles']]);
  expect(mocks.select).toHaveBeenCalledExactlyOnceWith('raw_profile_jsonb');
  expect(mocks.eq.mock.calls).toEqual([
    ['user_id', 'authenticated-user'],
    ['is_current', true],
  ]);
  for (const name of [
    'insert',
    'upsert',
    'update',
    'delete',
    'bootstrap',
    'profile',
    'overview',
    'recommendations',
    'translation',
    'generateTranslation',
    'cv',
  ] as const) {
    expect(mocks[name], name).not.toHaveBeenCalled();
  }
  for (const [link] of mocks.links.mock.calls) expect(link.prefetch).toBe(false);
}

describe('007.1 /traduccion: layout, auth, shell, lector y builder reales', () => {
  it('reads canonical maintenance tasks through the real builder and presents material-operation evidence without legacy calls', async () => {
    mocks.read.mockResolvedValue({
      data: {
        raw_profile_jsonb: {
          careerHistory: {
            experiences: [
              {
                id: 'saved-maintenance',
                activity: 'op_maintenance',
                maintenanceTasks: [
                  { material: 'light_vehicles', operations: ['levels_functioning'] },
                  { material: 'communications_equipment', operations: ['coaxial_repair'] },
                ],
              },
            ],
          },
        },
      },
      error: null,
    });
    const html = await renderPage();
    expect(html).toContain(
      'Comprobación de niveles y elementos de funcionamiento en vehículos ligeros.',
    );
    expect(html).toContain('Reparación de cableado coaxial en equipos de comunicaciones.');
    expect(html).toContain('Material: Vehículos ligeros');
    expect(html).toContain('Operaciones:');
    expect(html).toContain('Comprobaciones básicas de funcionamiento de vehículos ligeros');
    expect(html).not.toMatch(/Participación:|Reparación de antenas|saved-maintenance/);
    expectReadOnlyCore();
  });

  it('genera solo propuestas canonicas con evidencia y sin ejecutar el flujo legacy', async () => {
    const build = vi.spyOn(builder, 'buildExperienceProposals');
    const html = await renderPage();
    expect(build).toHaveBeenCalledExactlyOnceWith(history.experiences);
    expect(build.mock.results[0].value[0]).toMatchObject({
      experienceId: 'saved-training',
      cvDescription: {
        requiresReview: true,
        evidence: [
          {
            experienceId: 'saved-training',
            field: 'structuredExperiences.activity',
            value: 'technical_instruction',
          },
          {
            experienceId: 'saved-training',
            field: 'structuredExperiences.participation',
            value: 'instructed',
          },
        ],
      },
      civilianCompetencyCandidate: { requiresReview: true },
    });
    expect(html).toContain('Enseñanza en actividades de formación técnica.');
    expect(html).toContain('Propuestas pendientes de revisión');
    expect(html).toContain('No acreditan titulaciones ni certificaciones');
    expect(html).toContain('Participación: Enseñaba a otros a realizarla');
    expect(html).not.toMatch(
      /saved-training|technical_instruction|Vista previa textual anterior|Rutas sugeridas|\/cv\/preview/,
    );
    expect(html).toContain('href="/experiencia-profesional"');
    expect(html.match(/<main/g)).toHaveLength(1);
    expectReadOnlyCore();
  });

  it.each([
    ['sin perfil militar', null, 'No tienes un historial profesional guardado'],
    ['sin careerHistory', { raw_profile_jsonb: {} }, 'No hay experiencias guardadas'],
    [
      'vacio explicito',
      { raw_profile_jsonb: { careerHistory: { experiences: [] } } },
      'No hay experiencias guardadas',
    ],
    [
      'solo metadata',
      { raw_profile_jsonb: { source: 'private metadata' } },
      'No hay experiencias guardadas',
    ],
    [
      'actividad sin participacion',
      {
        raw_profile_jsonb: {
          careerHistory: { experiences: [{ id: 'one', activity: 'instruction' }] },
        },
      },
      'No hay propuestas fundamentadas',
    ],
    [
      'actividad sin regla',
      {
        raw_profile_jsonb: {
          careerHistory: {
            experiences: [{ id: 'one', activity: 'analysis', participation: ['instructed'] }],
          },
        },
      },
      'No hay propuestas fundamentadas',
    ],
    [
      'metadata sin evidencia de participacion',
      {
        raw_profile_jsonb: {
          careerHistory: {
            experiences: [
              {
                id: 'one',
                activity: 'instruction',
                durationRange: 'more_than_5_years',
                frequency: 'daily_or_almost_daily',
                autonomy: 'autonomous',
                assignmentContext: 'acting_replacement',
              },
            ],
          },
        },
      },
      'No hay propuestas fundamentadas',
    ],
  ])('%s no inventa propuestas ni crea estado', async (_name, data, message) => {
    mocks.read.mockResolvedValue({ data, error: null });
    const html = await renderPage();
    expect(html).toContain(message);
    expect(html).not.toContain('Descripción propuesta para CV');
    expect(html).not.toContain('private metadata');
    expectReadOnlyCore();
  });

  it.each([
    null,
    { careerHistory: null },
    { careerHistory: { experiences: [{ id: 'one', activity: 'private-invalid' }] } },
    {
      careerHistory: {
        experiences: [{ id: 'one', activity: 'instruction', stageIds: ['missing'] }],
      },
    },
  ])('distingue corrupcion de ausencia: %j', async (raw) => {
    mocks.read.mockResolvedValue({ data: { raw_profile_jsonb: raw }, error: null });
    const result = await readCareerHistory('authenticated-user');
    expect(result).toMatchObject({ ok: false, error: { code: 'INTERNAL_ERROR' } });
    expect(JSON.stringify(result)).not.toMatch(/private-invalid|Zod|issues|stageIds/);
    mocks.from.mockClear();
    mocks.select.mockClear();
    mocks.eq.mockClear();
    const html = await renderPage();
    expect(html).toContain('integridad de tu historial');
    expect(html).not.toContain('No hay experiencias');
    expect(html).not.toContain('private-invalid');
    expectReadOnlyCore();
  });

  it.each([
    ['08006', 'No pudimos leer tu historial'],
    ['PGRST116', 'integridad de tu historial'],
  ])('lectura fallida %s es explicita y segura', async (code, message) => {
    mocks.read.mockResolvedValue({
      data: null,
      error: { code, message: 'private provider details' },
    });
    const html = await renderPage();
    expect(html).toContain('role="alert"');
    expect(html).toContain(message);
    expect(html).toContain('href="/traduccion"');
    expect(html).not.toMatch(/private provider details|No hay experiencias/);
    expectReadOnlyCore();
  });

  it('una excepcion de transporte no se convierte en historial vacio', async () => {
    mocks.read.mockRejectedValue(new Error('private transport details'));
    const html = await renderPage();
    expect(html).toContain('No pudimos leer tu historial');
    expect(html).not.toMatch(/private transport details|No hay experiencias/);
    expectReadOnlyCore();
  });

  it('un fallo del builder no se presenta como evidencia insuficiente', async () => {
    vi.spyOn(builder, 'buildExperienceProposals').mockImplementation(() => {
      throw new Error('private builder');
    });
    const html = await renderPage();
    expect(html).toContain('No pudimos generar las propuestas');
    expect(html).not.toMatch(/private builder|No hay propuestas fundamentadas/);
    expectReadOnlyCore();
  });

  it.each(['reader', 'builder'])('preserva control flow Next en %s', async (stage) => {
    for (const digest of ['NEXT_REDIRECT;replace;/login;307;', 'DYNAMIC_SERVER_USAGE']) {
      const signal = Object.assign(new Error('Next control flow'), { digest });
      if (stage === 'reader') mocks.read.mockRejectedValue(signal);
      else
        vi.spyOn(builder, 'buildExperienceProposals').mockImplementation(() => {
          throw signal;
        });
      await expect(TranslationPage()).rejects.toBe(signal);
    }
  });

  it('layout y pagina rechazan sesion ausente antes de cualquier lectura de datos', async () => {
    mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
    for (const load of [() => TranslationPage(), () => CoreLayout({ children: 'protected' })]) {
      await expect(load()).rejects.toMatchObject({
        digest: expect.stringContaining('/login?redirectedFrom=%2Ftraduccion'),
      });
    }
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.bootstrap).not.toHaveBeenCalled();
  });

  it('loading solo anuncia propuestas, sin preview ni acceso a datos', () => {
    const html = renderToStaticMarkup(<TranslationLoadingPage />);
    expect(html).toContain('role="status"');
    expect(html).toContain('propuestas');
    expect(html).not.toMatch(/preview|CV/);
    expect(mocks.client).not.toHaveBeenCalled();
  });

  it('el lector distingue perfil ausente, historial ausente y vacio explicito', async () => {
    for (const [data, state] of [
      [null, 'missing_profile'],
      [{ raw_profile_jsonb: {} }, 'missing_history'],
      [{ raw_profile_jsonb: { careerHistory: { experiences: [] } } }, 'ready'],
    ] as const) {
      mocks.read.mockResolvedValue({ data, error: null });
      expect(await readCareerHistory('authenticated-user')).toMatchObject({
        ok: true,
        data: { state },
      });
    }
  });
});
