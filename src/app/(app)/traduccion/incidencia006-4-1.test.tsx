// @vitest-environment node
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProfile } from '@/features/profile/server/get-profile';
import { profileReadOutputSchema } from '@/features/profile/schemas/profile.schema';
import { mapProfileToTranslationSnapshot } from '@/features/profile/services/profile.mapper';
import { getCareerRoutesAction } from '@/features/recommendations/actions/get-career-routes-action';
import { selectCareerRoute } from '@/features/recommendations/server/select-career-route';
import { resolveRecommendationState } from '@/features/recommendations/server/resolve-recommendation-state';
import { buildRecommendationContext } from '@/features/recommendations/services/build-recommendation-input';
import { generateCareerRoutes } from '@/features/recommendations/server/generate-career-routes';
import * as routeGenerator from '@/features/recommendations/server/generate-career-routes';
import { createDomainError, domainFailure } from '@/lib/contracts';
import { cvPreviewDraftSchema } from '@/features/wizard/schemas/wizard-state.schema';
import { generateTranslation } from '@/features/translation/server/generate-translation';
import { getTranslation } from '@/features/translation/server/get-translation';
import { recommendationOutputFixture } from '@/features/recommendations/server/__fixtures__/recommendation-fixtures';
import { translationInputSchema } from '@/features/translation/schemas/translation.schema';
import { generateCv } from '@/features/cv/server/generate-cv';
import { mapTranslationOutputToCvInput } from '@/features/cv/services/cv.mapper';
import { getOnboardingOverview } from '@/features/wizard/server/get-onboarding-overview';
import { FUNCTION_TYPE_OPTIONS } from '@/features/wizard/config/wizard-catalogs';
import type { ProfileSupabaseShape } from '@/features/profile/types/profile.types';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/features/auth/server/get-current-user';
import TranslationPage from './page';

const { JSDOM } = createRequire(import.meta.url)('jsdom') as {
  JSDOM: new (markup: string) => { window: { document: Document } };
};

vi.mock('@/features/auth/server/get-current-user', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-001' }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

const shape: ProfileSupabaseShape = {
  app: {
    user_id: 'user-001',
    display_name: 'Test profile',
    email: 'test@example.com',
    locale: 'es-ES',
    timezone: 'Europe/Madrid',
    onboarding_completed: false,
    marketing_opt_in: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  military: {
    id: 'mil-001',
    user_id: 'user-001',
    is_current: true,
    branch: null,
    component: null,
    rank_text: null,
    specialty_text: null,
    service_years: null,
    latest_unit: null,
    latest_role_title: null,
    source_text: null,
    raw_profile_jsonb: {
      careerHistory: {
        experiences: [
          {
            id: 'saved-training',
            activity: 'technical_instruction',
            participation: ['instructed'],
          },
        ],
      },
    },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  civil: null,
};

let wizardError: string | null;
let rawHistory: unknown;
let wizardDraft: Record<string, unknown> | null;
let sourceSummary: string | null;
let reads: string[];
let writes: number;
let writeError: boolean;
let conflict: boolean;
let mutationFilters: Array<[string, unknown]>;
let insertConflict: boolean;

beforeEach(() => {
  vi.mocked(getCurrentUser)
    .mockReset()
    .mockResolvedValue({ id: 'user-001' } as Awaited<ReturnType<typeof getCurrentUser>>);
  wizardError = null;
  wizardDraft = null;
  sourceSummary = null;
  reads = [];
  writes = 0;
  writeError = false;
  conflict = false;
  mutationFilters = [];
  insertConflict = false;
  rawHistory = shape.military!.raw_profile_jsonb;
  vi.mocked(createClient).mockResolvedValue({
    from(table: string) {
      reads.push(table);
      const data =
        table === 'app_user_profiles'
          ? shape.app
          : table === 'user_military_profiles'
            ? [{ ...shape.military, source_text: sourceSummary, raw_profile_jsonb: rawHistory }]
            : table === 'user_wizard_state'
              ? wizardDraft
                ? { aggregated_draft_jsonb: wizardDraft }
                : null
              : [];
      const result = {
        data,
        error: table === 'user_wizard_state' && wizardError ? { message: wizardError } : null,
      };
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: async () => result,
        maybeSingle: async () => result,
        then: Promise.resolve(result).then.bind(Promise.resolve(result)),
        update: (payload: { aggregated_draft_jsonb: Record<string, unknown> }) => write(payload),
        insert: (payload: { aggregated_draft_jsonb: Record<string, unknown> }) => write(payload),
      };
      function write(payload: { aggregated_draft_jsonb: Record<string, unknown> }) {
        const filters: Array<[string, unknown]> = [];
        mutationFilters = filters;
        const mutation = {
          eq: (key: string, value: unknown) => {
            filters.push([key, value]);
            return mutation;
          },
          is: (key: string, value: unknown) => {
            filters.push([key, value]);
            return mutation;
          },
          select: () => mutation,
          maybeSingle: async () => {
            if (insertConflict)
              return { data: null, error: { code: '23505', message: 'private duplicate' } };
            if (writeError) return { data: null, error: { message: 'private write failure' } };
            const original = filters.find(([key]) => key === 'aggregated_draft_jsonb');
            if (conflict || (original && original[1] !== JSON.stringify(wizardDraft))) {
              return { data: null, error: null };
            }
            wizardDraft = structuredClone(payload.aggregated_draft_jsonb);
            writes += 1;
            return { data: { user_id: 'user-001' }, error: null };
          },
        };
        return mutation;
      }
      return query;
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
});

async function pageDocument() {
  return new JSDOM(renderToStaticMarkup(await TranslationPage())).window.document;
}

describe('Incidencia006.4.1 con lectura, schemas y motores reales; solo DB/auth simulados', () => {
  it('la ruta solo exporta el componente permitido por Next', async () => {
    expect(Object.keys(await import('./page'))).toEqual(['default']);
  });
  it.each(['NEXT_REDIRECT;replace;/login;307;', 'DYNAMIC_SERVER_USAGE'])(
    'la action real no debe convertir controlflow %s en error de dominio',
    async (digest) => {
      const signal = Object.assign(new Error('Next control flow'), { digest });
      vi.mocked(getCurrentUser).mockRejectedValue(signal);
      await expect(getCareerRoutesAction()).rejects.toBe(signal);
    },
  );
  it('lee historial persistido valido con legacy null y genera snapshot, traduccion y CV reales', async () => {
    const profile = (await getProfile('user-001'))!;
    expect(profileReadOutputSchema.parse(profile)).toEqual(profile);
    expect(profile.militaryBackground).toEqual({
      rank: null,
      area: null,
      yearsOfService: null,
      summary: null,
    });
    expect(profile.civilianTarget).toEqual({
      targetRole: null,
      targetSector: null,
      locationPreference: null,
    });
    expect(profile.careerHistory?.experiences[0]).toEqual({
      id: 'saved-training',
      activity: 'technical_instruction',
      participation: ['instructed'],
    });
    const snapshot = mapProfileToTranslationSnapshot(profile);
    expect(snapshot.summary).toBeNull();
    const input = translationInputSchema.parse({
      userId: profile.userId,
      sourceProfile: snapshot,
      sourceLanguage: 'es-ES',
      targetLanguage: 'en-US',
      tone: 'neutral',
    });
    const translation = await generateTranslation(input);
    expect(translation.ok).toBe(true);
    if (!translation.ok) throw new Error('Expected real legacy translation');
    const cv = await generateCv(
      mapTranslationOutputToCvInput({
        userId: profile.userId,
        profileSnapshotId: snapshot.snapshotId,
        translatedContent: translation.data,
        templateKey: 'single-column',
      }),
    );
    expect(cv.ok).toBe(true);
  });

  it('mantiene insuficiencia sin onboarding para technical_instruction sin equivalencia existente', async () => {
    const overview = await getOnboardingOverview('user-001');
    expect(overview.state).toBeNull();
    const profile = (await getProfile('user-001'))!;
    const { input, source } = buildRecommendationContext({
      userId: 'user-001',
      overview,
      careerHistory: profile.careerHistory,
    });
    expect(input.functionTypes).toEqual(['technical_instruction']);
    const now = new Date('2026-01-01T00:00:00Z');
    const result = generateCareerRoutes(input, { now, source });
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Insufficient structured profile to generate career routes',
      },
    });
    expect(await getCareerRoutesAction({ now })).toEqual(result);
  });

  it('conserva propuestas sin onboarding, sin overlay esperado ni legacy de ejemplo', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const doc = await pageDocument();
    expect(doc.body.textContent).toContain('Enseñanza en actividades de formación técnica.');
    expect(doc.body.textContent).toContain('Vista previa textual anterior');
    expect(doc.body.textContent).toContain('Completa las funciones y responsabilidades');
    expect(doc.querySelector('a[href="/onboarding/experiencia"]')?.textContent).toBe(
      'Completar experiencia del onboarding',
    );
    expect(doc.body.textContent).not.toContain('Reintentar rutas');
    expect(doc.body.textContent).toContain('no dispone de un resumen fuente');
    expect(doc.body.textContent).not.toContain('Profile data pending completion');
    expect(doc.body.textContent).not.toContain('Traduccion profesional');
    expect(doc.body.textContent).not.toContain('saved-training');
    expect(doc.querySelector('a[href="/cv/preview"]')).toBeNull();
    expect(log).not.toHaveBeenCalled();
    expect(doc.body.textContent).not.toContain('Necesitamos revisar los datos antes de continuar');
  });

  it('preserva exito simultaneo de propuestas, legacy y recomendaciones reales', async () => {
    sourceSummary = 'Experiencia real en instruccion y coordinacion de actividades tecnicas.';
    rawHistory = {
      careerHistory: {
        experiences: [
          {
            id: 'saved-training',
            activity: 'technical_instruction',
            participation: ['instructed'],
          },
          { id: 'saved-coordination', activity: 'coordination' },
        ],
      },
    };
    wizardDraft = {
      experiencia: {
        functionTypes: FUNCTION_TYPE_OPTIONS.slice(0, 4).map((option) => option.value),
      },
    };
    expect((await getCareerRoutesAction()).ok).toBe(true);
    const doc = await pageDocument();
    expect(doc.body.textContent).toContain('Enseñanza en actividades de formación técnica.');
    expect(doc.body.textContent).toContain('Vista previa textual anterior');
    expect(doc.body.textContent).toContain('Rutas sugeridas para tu transicion');
    expect(doc.querySelector('[role="alert"]')).toBeNull();
    expect(doc.querySelector('a[href="/cv/preview"]')?.textContent).toBe(
      'Revisar preview editable',
    );
    expect(doc.body.textContent).toContain(sourceSummary);
    expect(doc.body.textContent).not.toContain('profile-snapshot-user-001');
    expect(doc.body.textContent).not.toContain('saved-training');
    expect(doc.body.textContent).not.toContain('Profile data pending completion');
    const result = await getCareerRoutesAction();
    if (!result.ok) throw new Error('Expected recommendations');
    for (const route of result.data.routes) {
      expect(doc.body.textContent).not.toContain(route.routeId);
      expect(doc.body.textContent).not.toContain(route.roleId);
      expect(doc.body.textContent).not.toContain(route.sectorId);
    }
  });

  it('un fallo de lectura wizard tampoco bloquea el perfil ni las propuestas', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    wizardError = 'private wizard failure';
    await expect(getOnboardingOverview('user-001')).rejects.toThrow(
      'Error loading user_wizard_state: private wizard failure',
    );
    const doc = await pageDocument();
    expect(doc.body.textContent).toContain('Enseñanza en actividades de formación técnica.');
    expect(doc.body.textContent).toContain('No pudimos cargar las rutas sugeridas');
    expect(doc.body.textContent).not.toContain('private wizard failure');
    expect(doc.body.textContent).toContain('No pudimos leer los datos guardados');
    expect(doc.querySelector('a[href="/traduccion"]')?.textContent).toBe('Reintentar rutas');
    const result = await getCareerRoutesAction();
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'EXTERNAL_DEPENDENCY_ERROR',
        retryable: true,
        message: 'Unable to read stored onboarding data',
      },
    });
    expect(log).not.toHaveBeenCalled();
  });

  it('no convierte corrupcion del onboarding en insuficiencia ni historial vacio', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    wizardDraft = { militar: { serviceYears: -1 } };
    await expect(getOnboardingOverview('user-001')).rejects.toMatchObject({
      issues: [expect.objectContaining({ path: ['militar', 'serviceYears'] })],
    });
    const result = await getCareerRoutesAction();
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR', retryable: false },
    });
    const doc = await pageDocument();
    expect(doc.body.textContent).toContain('problema interno o de integridad de datos');
    expect(doc.body.textContent).toContain('Enseñanza en actividades de formación técnica.');
    expect(doc.body.textContent).not.toContain('Completar experiencia del onboarding');
    expect(doc.body.textContent).not.toContain('Reintentar rutas');
    expect(log.mock.calls).toEqual([
      ['Career routes action: unexpected context or generation failure'],
      ['Translation page: route context read failed'],
    ]);
  });

  it('historial persistido invalido falla con path preciso y no se convierte en vacio', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    rawHistory = {
      careerHistory: { experiences: [{ id: 'invalid', activity: 'not-a-catalog-code' }] },
    };
    await expect(getProfile('user-001')).rejects.toMatchObject({
      issues: [
        expect.objectContaining({
          path: ['careerHistory', 'experiences', 0, 'activity'],
          message: 'Select a valid activity catalog code',
        }),
      ],
    });
    const doc = await pageDocument();
    expect(doc.body.textContent).toContain('No pudimos leer tu perfil');
    expect(doc.body.textContent).not.toContain('No hay experiencias');
    expect(doc.querySelector('[aria-labelledby="experience-proposals-title"]')).toBeNull();
    expect(await getCareerRoutesAction()).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
    const translation = await getTranslation('user-001');
    expect(translation).toMatchObject({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to load translation context',
        retryable: false,
      },
    });
    expect(JSON.stringify(translation)).not.toMatch(
      /not-a-catalog-code|Zod|careerHistory|issues|path/,
    );
    expect(log).toHaveBeenCalledWith(
      'Career routes action: unexpected context or generation failure',
    );
  });

  it.each([
    [{}, true],
    [{ careerHistory: { experiences: [] } }, false],
    [
      {
        careerHistory: {
          experiences: [
            { id: 'unsupported', activity: 'technical_instruction', participation: ['instructed'] },
          ],
        },
      },
      false,
    ],
    [{ careerHistory: { experiences: [{ id: 'recognized', activity: 'analysis' }] } }, true],
  ])('action y getTranslation usan la misma fuente canonica %j, exito %s', async (raw, ok) => {
    rawHistory = raw;
    wizardDraft = {
      experiencia: {
        functionTypes: FUNCTION_TYPE_OPTIONS.slice(0, 4).map((option) => option.value),
      },
    };
    const action = await getCareerRoutesAction();
    reads = [];
    const translation = await getTranslation('user-001');
    expect(reads.filter((table) => table === 'user_military_profiles')).toHaveLength(1);
    expect(action.ok).toBe(ok);
    expect(translation.ok).toBe(ok);
    if (!ok) {
      expect(action).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Insufficient structured profile to generate career routes',
        },
      });
      expect(translation).toMatchObject({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Insufficient structured profile to generate career routes',
        },
      });
    }
  });

  it('genera rutas desde actividad reconocida sin wizard en ambos consumidores y en pagina', async () => {
    rawHistory = { careerHistory: { experiences: [{ id: 'recognized', activity: 'analysis' }] } };
    expect((await getCareerRoutesAction()).ok).toBe(true);
    const translation = await getTranslation('user-001');
    expect(translation.ok).toBe(true);
    if (!translation.ok || !translation.data) throw new Error('Expected translation context');
    expect(
      translation.data.recommendations.routes.some((route) =>
        route.explanation?.explanationKeywords.includes('analysis'),
      ),
    ).toBe(true);
    const doc = await pageDocument();
    expect(doc.body.textContent).toContain('Rutas sugeridas para tu transicion');
    expect(doc.body.textContent).not.toContain('Completa las funciones y responsabilidades');
  });

  it('no reutiliza recomendaciones persistidas si el historial actual es vacio', async () => {
    rawHistory = { careerHistory: { experiences: [] } };
    wizardDraft = { employabilityFlow: { recommendations: recommendationOutputFixture } };
    const translation = await getTranslation('user-001');
    expect(translation).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    const doc = await pageDocument();
    expect(doc.body.textContent).not.toContain('Rutas sugeridas para tu transicion');
    expect(doc.body.textContent).toContain('Completa las funciones y responsabilidades');
    expect(writes).toBe(0);
  });
});

async function currentRecommendations() {
  const result = await getCareerRoutesAction();
  if (!result.ok) throw new Error(`Expected recommendations: ${result.error.code}`);
  return result.data;
}

async function selectCurrent() {
  const output = await currentRecommendations();
  const result = await selectCareerRoute({
    userId: 'user-001',
    recommendationSetId: output.recommendationSetId,
    selectedRouteId: output.routes[0].routeId,
  });
  expect(result.ok).toBe(true);
  return output;
}

describe('006.4.2b CORE real con DB/auth simulados', () => {
  beforeEach(() => {
    rawHistory = { careerHistory: { experiences: [{ id: 'one', activity: 'instruction' }] } };
  });

  it('crea estado ausente, persiste fuente hash y permite seleccionar el conjunto generado', async () => {
    const output = await selectCurrent();
    expect(output.sourceSnapshotId).toMatch(/^recsrc-v1-[a-f0-9]{64}$/);
    expect(output.recommendationSetId.length).toBeLessThanOrEqual(128);
    expect(wizardDraft).toMatchObject({
      employabilityFlow: {
        recommendations: output,
        selectedRoute: { recommendationSetId: output.recommendationSetId },
      },
    });
    expect(writes).toBe(2);
  });

  it('reutiliza conjunto timestamp y seleccion exactos con otra fecha y request, sin escrituras', async () => {
    const output = await selectCurrent();
    const stored = structuredClone(wizardDraft);
    const result = await getCareerRoutesAction({
      now: new Date('2027-01-01'),
      requestId: 'new-request',
    });
    expect(result).toMatchObject({ ok: true, data: output });
    const translation = await getTranslation('user-001');
    expect(translation).toMatchObject({
      ok: true,
      data: {
        recommendations: output,
        selectedRouteId: output.routes[0].routeId,
        selectedRouteContext: {
          reasonSummarySnapshot: output.routes[0].explanation!.reasonSummary,
        },
      },
    });
    await pageDocument();
    expect(wizardDraft).toEqual(stored);
    expect(writes).toBe(2);
  });

  it.each(['edit', 'add'] as const)(
    'renueva por actividad %s y retira todos los aliases/contextos',
    async (change) => {
      const old = await selectCurrent();
      rawHistory = {
        careerHistory: {
          experiences:
            change === 'edit'
              ? [{ id: 'one', activity: 'analysis' }]
              : [
                  { id: 'one', activity: 'instruction' },
                  { id: 'two', activity: 'analysis' },
                ],
        },
      };
      const fresh = await currentRecommendations();
      expect(fresh.sourceSnapshotId).not.toBe(old.sourceSnapshotId);
      const flow = wizardDraft!.employabilityFlow as Record<string, unknown>;
      for (const key of ['selectedRoute', 'selectedRecommendation', 'selectedRouteContext'])
        expect(flow).not.toHaveProperty(key);
      expect(await getTranslation('user-001')).toMatchObject({
        ok: true,
        data: { recommendations: fresh },
      });
      const result = await selectCareerRoute({
        userId: 'user-001',
        recommendationSetId: old.recommendationSetId,
        selectedRouteId: old.routes[0].routeId,
      });
      expect(result).toMatchObject({
        ok: false,
        error: { code: 'VALIDATION_ERROR', details: { staleExplanationContext: true } },
      });
    },
  );

  it('no transfiere seleccion aunque routeId siga en el conjunto renovado', async () => {
    const old = await selectCurrent();
    wizardDraft!.objetivos = { targetSectors: ['training'] };
    const fresh = await currentRecommendations();
    expect(fresh.routes.some((route) => route.routeId === old.routes[0].routeId)).toBe(true);
    const translation = await getTranslation('user-001');
    expect(translation.ok).toBe(true);
    if (!translation.ok || !translation.data) throw new Error('Expected context');
    expect(translation.data).not.toHaveProperty('selectedRouteId');
    expect(translation.data).not.toHaveProperty('selectedRouteContext');
  });

  it('ignora metadata valida, ids, orden, duplicados y reasignacion de equipo equivalentes', async () => {
    rawHistory = {
      careerHistory: {
        experiences: [
          { id: 'one', activity: 'instruction', equipment: 'radio_comms' },
          { id: 'two', activity: 'analysis' },
        ],
      },
    };
    wizardDraft = { experiencia: { tools: ['office_suite', 'radio_comms'] } };
    const output = await selectCurrent();
    rawHistory = {
      careerHistory: {
        experiences: [
          {
            id: 'changed',
            activity: 'analysis',
            equipment: 'radio_comms',
            autonomy: 'autonomous',
            context: 'Valid context',
            participation: ['assisted'],
          },
          {
            id: 'changed-two',
            activity: 'instruction',
            durationRange: 'more_than_5_years',
            frequency: 'occasional',
            assignmentContext: 'acting_replacement',
          },
          { id: 'duplicate-activity', activity: 'instruction', result: 'Valid result' },
        ],
      },
    };
    wizardDraft!.experiencia = {
      tools: ['radio_comms', 'office_suite'],
      additionalContext: 'Ignored narrative',
    };
    expect(await currentRecommendations()).toEqual(output);
    expect(writes).toBe(2);
  });

  it.each([
    { objetivos: { targetSectors: ['training'] } },
    { objetivos: { targetRoles: ['training-specialist'] } },
    { objetivos: { seniority: 'senior', workModel: 'remote' } },
    { competencias: { softSkills: ['leadership'] } },
    { militar: { leadershipLevel: 'small_team_lead', teamSize: '16_40' } },
    { experiencia: { responsibilityAreas: ['planning'] } },
  ])('renueva por preferencias o complementos efectivos %j', async (patch) => {
    const old = await currentRecommendations();
    Object.assign(wizardDraft!, patch);
    expect((await currentRecommendations()).sourceSnapshotId).not.toBe(old.sourceSnapshotId);
  });

  it('no invalida por tokens validos sin efecto ni preferencias/arrays reordenados', async () => {
    wizardDraft = { objetivos: { targetSectors: ['training', 'consulting'] } };
    const old = await currentRecommendations();
    wizardDraft!.objetivos = {
      targetSectors: ['consulting', 'training'],
      preferencesNotes: 'Ignored',
    };
    wizardDraft!.competencias = {
      certifications: ['quality_iso'],
      languages: [{ name: 'english', level: 'advanced' }],
    };
    expect(await currentRecommendations()).toEqual(old);
    expect(writes).toBe(1);
  });

  it('legacy valido se renueva una vez; ausencia y history presente no comparten identidad', async () => {
    rawHistory = {};
    wizardDraft = {
      experiencia: { functionTypes: FUNCTION_TYPE_OPTIONS.slice(0, 4).map((item) => item.value) },
      employabilityFlow: { recommendations: recommendationOutputFixture },
    };
    const legacy = await currentRecommendations();
    expect(legacy.sourceSnapshotId).not.toBe(recommendationOutputFixture.sourceSnapshotId);
    rawHistory = { careerHistory: { experiences: [{ id: 'one', activity: 'instruction' }] } };
    expect((await currentRecommendations()).sourceSnapshotId).not.toBe(legacy.sourceSnapshotId);
  });

  it.each([
    {},
    { careerHistory: { experiences: [] } },
    { careerHistory: { experiences: [{ id: 'one', activity: 'technical_instruction' }] } },
    { careerHistory: { experiences: [{ id: 'one', activity: 'invalid-private' }] } },
    {
      careerHistory: {
        experiences: [{ id: 'one', activity: 'instruction', stageIds: ['missing'] }],
      },
    },
    {
      careerHistory: {
        experiences: [{ id: 'one', activity: 'instruction', autonomy: 'invalid-private' }],
      },
    },
  ])('gate e integridad SIEMPRE antes de cache: %j', async (history) => {
    await selectCurrent();
    const stored = structuredClone(wizardDraft);
    rawHistory = history;
    expect(await getCareerRoutesAction()).toMatchObject({ ok: false });
    expect(await getTranslation('user-001')).toMatchObject({ ok: false });
    expect((await pageDocument()).body.textContent).not.toContain(
      'Rutas sugeridas para tu transicion',
    );
    expect(wizardDraft).toEqual(stored);
    expect(writes).toBe(2);
  });

  it.each([false, true])(
    'detecta output raw corrupto aunque overview lo haya descartado, con insuficiencia %s',
    async (insufficient) => {
      if (insufficient) rawHistory = { careerHistory: { experiences: [] } };
      wizardDraft = {
        employabilityFlow: { recommendations: { ...recommendationOutputFixture, routes: [] } },
      };
      expect((await getOnboardingOverview('user-001')).employabilityFlow).toBeUndefined();
      expect(await getCareerRoutesAction()).toMatchObject({
        ok: false,
        error: { code: 'INTERNAL_ERROR' },
      });
      expect(await getTranslation('user-001')).toMatchObject({
        ok: false,
        error: { code: 'INTERNAL_ERROR' },
      });
      expect(writes).toBe(0);
    },
  );

  it('rechaza seleccion stale directamente aunque aun este persistida, sin escribir', async () => {
    const old = await selectCurrent();
    rawHistory = { careerHistory: { experiences: [{ id: 'one', activity: 'analysis' }] } };
    const result = await selectCareerRoute({
      userId: 'user-001',
      recommendationSetId: old.recommendationSetId,
      selectedRouteId: old.routes[0].routeId,
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION_ERROR', details: { staleExplanationContext: true } },
    });
    expect(writes).toBe(2);
  });

  it.each(['wrong-set', 'null-primary', 'not-in-set'] as const)(
    'omite seleccion/contexto incoherentes sin promover alias: %s',
    async (invalid) => {
      const old = await selectCurrent();
      const flow = wizardDraft!.employabilityFlow as Record<string, unknown>;
      flow.selectedRoute =
        invalid === 'null-primary'
          ? null
          : {
              recommendationSetId: invalid === 'wrong-set' ? 'wrong-set' : old.recommendationSetId,
              selectedRouteId: invalid === 'not-in-set' ? 'not-in-set' : old.routes[0].routeId,
              selectedAt: old.generatedAt,
            };
      const translation = await getTranslation('user-001');
      expect(translation.ok).toBe(true);
      if (!translation.ok || !translation.data) throw new Error('Expected context');
      expect(translation.data).not.toHaveProperty('selectedRouteId');
      expect(translation.data).not.toHaveProperty('selectedRouteContext');
      expect(writes).toBe(2);
    },
  );

  it('preserva JSONB ajeno y CV draft al renovar; no persiste history ni sidecar', async () => {
    const cvPreviewDraft = cvPreviewDraftSchema.parse({
      previewVersionId: 'preview-1',
      isUserEdited: true,
      updatedAt: '2026-01-01T00:00:00Z',
      cvPreview: {
        sections: [
          {
            id: 'section-1',
            title: 'Edited title',
            content: 'User edited content',
            sourceBlockIds: ['block-1'],
          },
        ],
        layout: { templateKey: 'single-column', columns: 1 },
        completeness: 'complete',
      },
    });
    wizardDraft = {
      customRoot: { keep: true },
      employabilityFlow: { customNested: { keep: true }, cvPreviewDraft },
    };
    await selectCurrent();
    const before = structuredClone(wizardDraft);
    rawHistory = {
      careerHistory: { experiences: [{ id: 'private-experience-id', activity: 'analysis' }] },
    };
    await currentRecommendations();
    expect(wizardDraft).toMatchObject({
      customRoot: before!.customRoot,
      employabilityFlow: { customNested: { keep: true }, cvPreviewDraft },
    });
    expect(JSON.stringify(wizardDraft)).not.toMatch(
      /private-experience-id|careerHistory|wizardTools/,
    );
  });

  it.each(['error', 'conflict'] as const)(
    'no ofrece un conjunto que no se pudo persistir: %s',
    async (failure) => {
      wizardDraft = {};
      writeError = failure === 'error';
      conflict = failure === 'conflict';
      const result = await getCareerRoutesAction();
      expect(result).toMatchObject({
        ok: false,
        error: { code: failure === 'error' ? 'EXTERNAL_DEPENDENCY_ERROR' : 'CONFLICT' },
      });
      expect(JSON.stringify(result)).not.toContain('private write failure');
      expect(wizardDraft).toEqual({});
      expect(writes).toBe(0);
      expect(mutationFilters).toEqual([
        ['user_id', 'user-001'],
        ['aggregated_draft_jsonb', '{}'],
      ]);
    },
  );

  it.each(['error', 'conflict'] as const)(
    'seleccion no sobrescribe otro draft ni declara exito: %s',
    async (failure) => {
      const output = await currentRecommendations();
      const stored = structuredClone(wizardDraft);
      writeError = failure === 'error';
      conflict = failure === 'conflict';
      const result = await selectCareerRoute({
        userId: 'user-001',
        recommendationSetId: output.recommendationSetId,
        selectedRouteId: output.routes[0].routeId,
      });
      expect(result).toMatchObject({
        ok: false,
        error: { code: failure === 'error' ? 'EXTERNAL_DEPENDENCY_ERROR' : 'CONFLICT' },
      });
      expect(wizardDraft).toEqual(stored);
      expect(writes).toBe(1);
      expect(mutationFilters).toEqual([
        ['user_id', 'user-001'],
        ['aggregated_draft_jsonb', JSON.stringify(stored)],
      ]);
    },
  );

  it('fallo de generacion no ofrece el conjunto viejo ni modifica selecciones almacenadas', async () => {
    await selectCurrent();
    const stored = structuredClone(wizardDraft);
    rawHistory = { careerHistory: { experiences: [{ id: 'one', activity: 'analysis' }] } };
    vi.spyOn(routeGenerator, 'generateCareerRoutes').mockReturnValue(
      domainFailure(
        createDomainError({ code: 'INTERNAL_ERROR', message: 'Safe generation failure' }),
      ),
    );
    expect(await getCareerRoutesAction()).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
    expect(await getTranslation('user-001')).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
    const doc = await pageDocument();
    expect(doc.body.textContent).not.toContain('Rutas sugeridas para tu transicion');
    expect(wizardDraft).toEqual(stored);
    expect(writes).toBe(2);
  });

  it('pagina renueva el conjunto almacenado sin duplicar perfil/auth ni reutilizar contexto', async () => {
    const old = await selectCurrent();
    rawHistory = { careerHistory: { experiences: [{ id: 'one', activity: 'analysis' }] } };
    reads = [];
    vi.mocked(getCurrentUser).mockClear();
    sourceSummary = 'Existing summary for the legacy pipeline.';
    const doc = await pageDocument();
    expect(doc.body.textContent).toContain('Rutas sugeridas para tu transicion');
    expect(doc.body.textContent).not.toContain(old.routes[0].explanation!.reasonSummary);
    expect(reads.filter((table) => table === 'user_military_profiles')).toHaveLength(1);
    expect(vi.mocked(getCurrentUser)).toHaveBeenCalledTimes(1);
    expect(writes).toBe(3);
  });

  it('traduccion renueva directamente y no adjunta la seleccion anterior', async () => {
    const old = await selectCurrent();
    rawHistory = { careerHistory: { experiences: [{ id: 'one', activity: 'analysis' }] } };
    const result = await getTranslation('user-001');
    expect(result.ok).toBe(true);
    if (!result.ok || !result.data) throw new Error('Expected context');
    expect(result.data.recommendations.sourceSnapshotId).not.toBe(old.sourceSnapshotId);
    expect(result.data).not.toHaveProperty('selectedRouteId');
    expect(result.data).not.toHaveProperty('selectedRouteContext');
    expect(writes).toBe(3);
  });

  it('no usa cache legacy si cae el gate aunque las senales efectivas no cambien', async () => {
    rawHistory = {};
    wizardDraft = {
      militar: { branch: 'army', corps: 'signals', rank: { code: 'captain', label: 'Captain' } },
      experiencia: { functionTypes: ['instruction'] },
    };
    await currentRecommendations();
    wizardDraft!.militar = { branch: 'army', rank: { code: 'captain', label: 'Captain' } };
    const stored = structuredClone(wizardDraft);
    expect(await getCareerRoutesAction()).toMatchObject({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Insufficient structured profile to generate career routes',
      },
    });
    expect(wizardDraft).toEqual(stored);
    expect(writes).toBe(1);
  });

  it('una carrera al crear estado ausente es CONFLICT, nunca upsert destructivo', async () => {
    insertConflict = true;
    const result = await getCareerRoutesAction();
    expect(result).toMatchObject({ ok: false, error: { code: 'CONFLICT', retryable: true } });
    expect(JSON.stringify(result)).not.toContain('private duplicate');
    expect(wizardDraft).toBeNull();
    expect(writes).toBe(0);
  });

  it('rechaza mezclar perfil de otro usuario antes de aceptar cache o escribir', async () => {
    await currentRecommendations();
    const overview = await getOnboardingOverview('user-001');
    const profile = await getProfile('user-001');
    const result = await resolveRecommendationState({ userId: 'another-user', overview, profile });
    expect(result).toMatchObject({ ok: false, error: { code: 'INTERNAL_ERROR' } });
    expect(writes).toBe(1);
  });
});
