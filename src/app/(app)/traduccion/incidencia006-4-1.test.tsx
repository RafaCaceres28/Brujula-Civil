// @vitest-environment node
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProfile } from '@/features/profile/server/get-profile';
import { profileReadOutputSchema } from '@/features/profile/schemas/profile.schema';
import { mapProfileToTranslationSnapshot } from '@/features/profile/services/profile.mapper';
import { getCareerRoutesAction } from '@/features/recommendations/actions/get-career-routes-action';
import { buildRecommendationInput } from '@/features/recommendations/services/build-recommendation-input';
import { generateCareerRoutes } from '@/features/recommendations/server/generate-career-routes';
import { generateTranslation } from '@/features/translation/server/generate-translation';
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

beforeEach(() => {
  vi.mocked(getCurrentUser)
    .mockReset()
    .mockResolvedValue({ id: 'user-001' } as Awaited<ReturnType<typeof getCurrentUser>>);
  wizardError = null;
  wizardDraft = null;
  sourceSummary = null;
  rawHistory = shape.military!.raw_profile_jsonb;
  vi.mocked(createClient).mockResolvedValue({
    from(table: string) {
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
      };
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

  it('reproduce la precondicion real de recomendaciones sin onboarding, no un parse legacy', async () => {
    const overview = await getOnboardingOverview('user-001');
    expect(overview.state).toBeNull();
    const input = buildRecommendationInput({ userId: 'user-001', overview });
    expect(input.functionTypes).toEqual([]);
    const now = new Date('2026-01-01T00:00:00Z');
    const result = generateCareerRoutes(input, { now });
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
  });
});
