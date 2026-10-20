// @vitest-environment node
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { profileDomainFixture } from '@/features/translation/server/__fixtures__/contract-fixtures';
import * as proposalBuilder from '@/features/translation/services/experience-proposals.builder';
import * as profileMapper from '@/features/profile/services/profile.mapper';
import * as translationGenerator from '@/features/translation/server/generate-translation';
import * as cvMapper from '@/features/cv/services/cv.mapper';
import * as cvGenerator from '@/features/cv/server/generate-cv';
import { profileReadOutputSchema } from '@/features/profile/schemas/profile.schema';
import { createDomainError, domainFailure } from '@/lib/contracts';
import TranslationPage from './page';

const { JSDOM } = createRequire(import.meta.url)('jsdom') as {
  JSDOM: new (markup: string) => { window: { document: Document } };
};

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  profile: vi.fn(),
  overview: vi.fn(),
  recommendations: vi.fn(),
}));
vi.mock('@/features/auth/server/get-required-user', () => ({ getRequiredUser: mocks.user }));
vi.mock('@/features/profile/server/get-profile', () => ({ getProfile: mocks.profile }));
vi.mock('@/features/wizard/server/get-onboarding-overview', () => ({
  getOnboardingOverview: mocks.overview,
}));
vi.mock('@/features/recommendations/server/resolve-recommendation-state', () => ({
  resolveRecommendationState: mocks.recommendations,
}));
vi.mock('@/features/recommendations/actions/select-career-route-action', () => ({
  selectCareerRouteAction: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: profileDomainFixture.userId });
  mocks.overview.mockResolvedValue({
    employabilityFlow: { recommendations: { recommendationSetId: 'saved-routes', routes: [] } },
  });
  mocks.recommendations.mockResolvedValue({
    ok: true,
    data: { recommendations: { recommendationSetId: 'saved-routes', routes: [] } },
  });
  mocks.profile.mockResolvedValue({
    ...profileDomainFixture,
    careerHistory: {
      experiences: [
        {
          id: 'saved-training',
          activity: 'technical_instruction',
          participation: ['instructed', 'assisted'],
        },
      ],
    },
  });
});

async function pageDocument() {
  return new JSDOM(renderToStaticMarkup(await TranslationPage())).window.document;
}

describe('/traduccion propuestas desde perfil autenticado', () => {
  it('renderiza pares reales con fuente y evidencia junto al pipeline anterior intacto', async () => {
    const doc = await pageDocument();
    const proposals = doc.querySelector('[aria-labelledby="experience-proposals-title"]')!;
    expect(proposals.textContent).toContain('Propuestas pendientes de revisión');
    expect(proposals.textContent).toContain('Descripción propuesta para CV');
    expect(proposals.textContent).toContain('Competencia civil candidata');
    expect(proposals.textContent).toContain('Enseñanza en actividades de formación técnica.');
    expect(proposals.textContent).toContain('Apoyo en actividades de formación técnica.');
    expect(proposals.textContent).toContain('Experiencia: Instrucción y Adiestramiento Técnico');
    expect(proposals.textContent).not.toContain('saved-training');
    expect(proposals.querySelector('ul[aria-label="Evidencia utilizada"]')?.textContent).toContain(
      'Participación: Ayudaba a realizarla',
    );
    expect(proposals.textContent).toContain('No acreditan titulaciones ni certificaciones');
    expect(proposals.textContent).not.toContain('technical_instruction');
    expect(proposals.textContent).not.toContain(profileDomainFixture.militaryBackground.summary);
    const legacy = doc.querySelector('[aria-label="Vista previa textual anterior"]')!;
    expect(legacy.textContent).toContain(profileDomainFixture.militaryBackground.summary);
    expect(legacy.textContent).not.toContain('Competencia civil candidata');
    expect(mocks.profile).toHaveBeenCalledExactlyOnceWith(profileDomainFixture.userId);
    expect(mocks.user).toHaveBeenCalledExactlyOnceWith('/traduccion');
    expect(mocks.recommendations).toHaveBeenCalledExactlyOnceWith({
      userId: profileDomainFixture.userId,
      overview: await mocks.overview.mock.results[0].value,
      profile: await mocks.profile.mock.results[0].value,
    });
  });

  it.each([undefined, { experiences: [] }])(
    'explica historial ausente o vacío: %j',
    async (careerHistory) => {
      mocks.profile.mockResolvedValue({ ...profileDomainFixture, careerHistory });
      const doc = await pageDocument();
      expect(doc.body.textContent).toContain(
        'No hay experiencias guardadas para fundamentar propuestas.',
      );
      expect(doc.body.textContent).toContain('Vista previa textual anterior');
    },
  );

  it('explica evidencia insuficiente sin fabricar propuestas', async () => {
    mocks.profile.mockResolvedValue({
      ...profileDomainFixture,
      careerHistory: {
        experiences: [
          { id: 'only-activity', activity: 'technical_instruction' },
          { id: 'other', activity: 'analysis', participation: ['instructed'] },
        ],
      },
    });
    const doc = await pageDocument();
    expect(doc.body.textContent).toContain(
      'No hay propuestas fundamentadas para estas experiencias.',
    );
    expect(doc.body.textContent).toContain(
      'actividad de formación y participación declarada en la misma experiencia',
    );
    expect(doc.body.textContent).not.toContain('Descripción propuesta para CV');
  });

  it('muestra error de lectura explícito y seguro, no un historial vacío', async () => {
    mocks.profile.mockRejectedValue(new Error('private database failure'));
    const doc = await pageDocument();
    expect(doc.querySelector('[role="alert"]')?.textContent).toContain('No pudimos leer tu perfil');
    expect(doc.body.textContent).not.toContain('private database failure');
    expect(doc.body.textContent).not.toContain('No hay experiencias');
    expect(doc.querySelector('a[href="/traduccion"]')).not.toBeNull();
    expect(mocks.profile).toHaveBeenCalledTimes(1);
  });

  it('preserva perfil inexistente y no intercepta el rechazo de autenticación', async () => {
    mocks.profile.mockResolvedValue(null);
    expect((await pageDocument()).body.textContent).toContain('No hay datos suficientes');
    mocks.profile.mockClear();
    mocks.user.mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(TranslationPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.profile).not.toHaveBeenCalled();
  });

  it('un fallo del builder es explicito, no propuestas vacias ni error legacy', async () => {
    vi.spyOn(proposalBuilder, 'buildExperienceProposals').mockImplementation(() => {
      throw new Error('private builder failure');
    });
    const doc = await pageDocument();
    expect(doc.body.textContent).toContain('No pudimos generar las propuestas desde tu historial');
    expect(doc.body.textContent).toContain('Vista previa textual anterior');
    expect(doc.body.textContent).not.toContain('No hay propuestas fundamentadas');
    expect(doc.body.textContent).not.toContain('private builder failure');
    expect(doc.body.textContent).not.toContain('No pudimos completar la traduccion');
  });

  it.each(['snapshot', 'translation', 'cv-input', 'cv'])(
    'aisla excepcion de %s legacy sin ocultar propuestas validas',
    async (stage) => {
      const fail = () => {
        throw new Error('private legacy failure');
      };
      if (stage === 'snapshot')
        vi.spyOn(profileMapper, 'mapProfileToTranslationSnapshot').mockImplementation(fail);
      if (stage === 'translation')
        vi.spyOn(translationGenerator, 'generateTranslation').mockImplementation(fail);
      if (stage === 'cv-input')
        vi.spyOn(cvMapper, 'mapTranslationOutputToCvInput').mockImplementation(fail);
      if (stage === 'cv') vi.spyOn(cvGenerator, 'generateCv').mockImplementation(fail);
      const doc = await pageDocument();
      expect(doc.body.textContent).toContain('Enseñanza en actividades de formación técnica.');
      expect(doc.body.textContent).toContain('No pudimos generar la vista previa textual anterior');
      expect(doc.body.textContent).not.toContain('private legacy failure');
      expect(doc.querySelector('a[href="/cv/preview"]')).toBeNull();
    },
  );

  it.each(['translation', 'cv'])('aisla resultado de error %s legacy', async (stage) => {
    const failure = {
      ok: false as const,
      error: { code: 'VALIDATION_ERROR' as const, message: 'private invalid input' },
    };
    if (stage === 'translation')
      vi.spyOn(translationGenerator, 'generateTranslation').mockResolvedValue(failure);
    else vi.spyOn(cvGenerator, 'generateCv').mockResolvedValue(failure);
    const doc = await pageDocument();
    expect(doc.body.textContent).toContain('Enseñanza en actividades de formación técnica.');
    expect(doc.body.textContent).toContain('No pudimos generar la vista previa textual anterior');
    expect(doc.body.textContent).not.toContain('private invalid input');
  });

  it('conserva propuestas ante un parse real del snapshot legacy invalido', async () => {
    const profile = profileReadOutputSchema.parse({
      ...profileDomainFixture,
      userId: 'x'.repeat(128),
      careerHistory: {
        experiences: [
          {
            id: 'saved-training',
            activity: 'technical_instruction',
            participation: ['instructed'],
          },
        ],
      },
    });
    // The read contract permits this ID, but the prefixed legacy snapshot exceeds 128 characters.
    expect(() => profileMapper.mapProfileToTranslationSnapshot(profile)).toThrow();
    try {
      profileMapper.mapProfileToTranslationSnapshot(profile);
    } catch (error) {
      expect(error).toMatchObject({
        issues: [
          expect.objectContaining({
            path: ['snapshotId'],
            code: 'too_big',
            message: 'Too big: expected string to have <=128 characters',
          }),
        ],
      });
    }
    mocks.profile.mockResolvedValue(profile);
    const doc = await pageDocument();
    expect(doc.body.textContent).toContain('Enseñanza en actividades de formación técnica.');
    expect(doc.body.textContent).toContain('No pudimos generar la vista previa textual anterior');
  });

  it('una excepcion de recomendaciones es visible sin bloquear propuestas ni legacy', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.overview.mockResolvedValue({});
    mocks.recommendations.mockRejectedValue(new Error('private recommendation failure'));
    const doc = await pageDocument();
    expect(doc.body.textContent).toContain('No pudimos cargar las rutas sugeridas');
    expect(doc.body.textContent).toContain('Enseñanza en actividades de formación técnica.');
    expect(doc.body.textContent).toContain('Vista previa textual anterior');
    expect(doc.body.textContent).not.toContain('private recommendation failure');
    expect(doc.body.textContent).toContain('problema interno o de integridad de datos');
    expect(doc.body.textContent).not.toContain('Reintentar rutas');
    expect(log).toHaveBeenCalledExactlyOnceWith('Translation page: route context read failed');
  });

  it('clasifica resultados por codigo, mensaje exacto y fuente, no por VALIDATION_ERROR generico', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.overview.mockResolvedValue({});
    const cases = [
      {
        code: 'VALIDATION_ERROR',
        message: 'Invalid recommendation input payload',
        source: 'recs.server.generate-routes',
        text: 'Los datos enviados para las rutas no son validos',
        action: 'Revisar experiencias y datos del perfil',
        logs: false,
      },
      {
        code: 'VALIDATION_ERROR',
        message: 'Career route shortlist must contain between 3 and 5 entries',
        source: 'recs.server.generate-routes',
        text: 'problema interno o de integridad de datos',
        action: null,
        logs: true,
      },
      {
        code: 'VALIDATION_ERROR',
        message: 'Failed to generate a valid recommendation shortlist',
        source: 'recs.server.generate-routes',
        text: 'problema interno o de integridad de datos',
        action: null,
        logs: true,
      },
      {
        code: 'VALIDATION_ERROR',
        message: 'Insufficient structured profile to generate career routes',
        source: 'another.source',
        text: 'problema interno o de integridad de datos',
        action: null,
        logs: true,
      },
      {
        code: 'EXTERNAL_DEPENDENCY_ERROR',
        message: 'private provider details',
        source: 'recs.action.get-career-routes',
        text: 'El servicio no esta disponible temporalmente',
        action: 'Reintentar rutas',
        logs: false,
      },
      {
        code: 'INTERNAL_ERROR',
        message: 'private provider details',
        source: 'recs.server.generate-routes',
        text: 'problema interno o de integridad de datos',
        action: null,
        logs: true,
      },
    ] as const;
    for (const entry of cases) {
      log.mockClear();
      mocks.recommendations.mockResolvedValue(
        domainFailure(createDomainError({ code: entry.code, message: entry.message }), {
          source: entry.source,
          timestamp: '2026-01-01T00:00:00Z',
        }),
      );
      const doc = await pageDocument();
      expect(doc.body.textContent).toContain(entry.text);
      expect(doc.body.textContent).toContain('Enseñanza en actividades de formación técnica.');
      expect(doc.body.textContent).toContain(profileDomainFixture.militaryBackground.summary);
      expect(doc.body.textContent).not.toContain('Completa las funciones y responsabilidades');
      expect(doc.body.textContent).not.toContain(entry.message);
      const action = [...doc.querySelectorAll('a')].find((link) =>
        ['Reintentar rutas', 'Revisar experiencias y datos del perfil'].includes(
          link.textContent ?? '',
        ),
      );
      expect(action?.textContent ?? null).toBe(entry.action);
      if (action)
        expect(action.getAttribute('href')).toBe(
          entry.action === 'Reintentar rutas' ? '/traduccion' : '/onboarding/experiencia',
        );
      if (entry.logs)
        expect(log).toHaveBeenCalledExactlyOnceWith(
          'Translation page: career recommendations internal failure',
        );
      else expect(log).not.toHaveBeenCalled();
    }
  });

  it.each([
    'profile',
    'overview',
    'recommendations',
    'builder',
    'snapshot',
    'translation',
    'cv-input',
    'cv',
  ])('no consume redirect ni excepciones dynamic de Next en %s', async (stage) => {
    for (const digest of ['NEXT_REDIRECT;replace;/login;307;', 'DYNAMIC_SERVER_USAGE']) {
      const signal = Object.assign(new Error('Next control flow'), { digest });
      const fail = () => {
        throw signal;
      };
      if (stage === 'profile') mocks.profile.mockImplementation(fail);
      if (stage === 'overview') mocks.overview.mockImplementation(fail);
      if (stage === 'recommendations') {
        mocks.overview.mockResolvedValue({});
        mocks.recommendations.mockImplementation(fail);
      }
      if (stage === 'builder')
        vi.spyOn(proposalBuilder, 'buildExperienceProposals').mockImplementation(fail);
      if (stage === 'snapshot')
        vi.spyOn(profileMapper, 'mapProfileToTranslationSnapshot').mockImplementation(fail);
      if (stage === 'translation')
        vi.spyOn(translationGenerator, 'generateTranslation').mockImplementation(fail);
      if (stage === 'cv-input')
        vi.spyOn(cvMapper, 'mapTranslationOutputToCvInput').mockImplementation(fail);
      if (stage === 'cv') vi.spyOn(cvGenerator, 'generateCv').mockImplementation(fail);
      await expect(TranslationPage()).rejects.toBe(signal);
    }
  });
});
