import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { structuredExperienceSchema } from '@/features/translation/schemas/structured-experience.schema';
import { competencyEvidenceKey } from '@/features/translation/services/competency-review';
import * as builder from '@/features/translation/services/experience-proposals.builder';
import CoreLayout from '../layout';
import ProfessionalProfilePage from '../perfil-profesional/page';
import CvDraftPage from './page';

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
  rpc: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.client }));

const experience = structuredExperienceSchema.parse({
  id: 'training-source',
  activity: 'instruction',
  instructionActivities: ['demonstrated', 'explained_to_peers', 'prepared_and_delivered'],
  otherTasks: [
    {
      description: 'Declaración original privada',
      target: 'Objeto original privado',
      confirmedDescription: 'Texto confirmado <script>no ejecutar</script>',
    },
    { description: 'Tarea pendiente privada', target: 'Objeto pendiente privado' },
  ],
});
const candidates = builder
  .buildExperienceProposals([experience])
  .map((proposal) => proposal.civilianCompetencyCandidate);

function fixture() {
  return {
    ...structuredClone(experience),
    competencyReviews: candidates.map((candidate, index) => ({
      competencyId: candidate.id,
      evidenceKey: index === 2 ? 'obsolete-evidence' : competencyEvidenceKey(candidate),
      decision: index === 1 ? ('discarded' as const) : ('accepted' as const),
    })),
  };
}

function storedHistory(experiences: unknown) {
  const data = { raw_profile_jsonb: { careerHistory: { experiences } } };
  mocks.read.mockResolvedValue({ data, error: null });
  return data;
}

async function renderPage(page = CvDraftPage) {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(await CoreLayout({ children: await page() }));
  return container;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ data: { user: { id: 'authenticated-user' } }, error: null });
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
  mocks.client.mockResolvedValue({
    auth: { getUser: mocks.auth },
    from: mocks.from,
    rpc: mocks.rpc,
  });
  storedHistory([fixture()]);
});

describe('007.5e /cv-borrador: contenido confirmado de solo lectura', () => {
  it.each([
    { raw_profile_jsonb: { careerHistory: { experiences: [fixture()] } } },
    null,
    { raw_profile_jsonb: { careerHistory: { experiences: [{}] } } },
  ])(
    'always identifies missing CV data without inventing it or reading other sources (%#)',
    async (data) => {
      mocks.read.mockResolvedValue({ data, error: null });
      const container = await renderPage();
      const notice = container.querySelector('[aria-labelledby="cv-missing-data"]')!;
      expect(notice.querySelector('h2')?.textContent).toBe('Datos pendientes para completar el CV');
      expect(notice.textContent).toContain('no incluye nombre, datos de contacto ni formación');
      expect(notice.textContent).toContain('no están disponibles en esta vista');
      expect(notice.textContent).toContain('faltan para completar el CV');
      expect(notice.textContent).toContain('No se consultan otras fuentes ni se inventan datos');
      expect(notice.textContent).toContain(
        'esa parte del CV queda pendiente; no se inventa experiencia',
      );
      expect(mocks.from.mock.calls).toEqual([['user_military_profiles']]);
      expect(
        container.querySelector('form, button, input, textarea, select, a[download]'),
      ).toBeNull();
    },
  );

  it('reads only current user history, selects once, escapes confirmed text and never writes', async () => {
    const data = storedHistory([fixture()]);
    const before = structuredClone(data);
    const build = vi.spyOn(builder, 'buildExperienceProposals');
    build.mockClear();
    const container = await renderPage();
    expect(build).toHaveBeenCalledTimes(1);
    expect(container.querySelector('h1')?.textContent).toBe('Borrador de CV');
    expect(container.textContent).toContain('Solo lectura');
    expect(container.textContent).toContain('No acredita titulaciones ni habilitaciones');
    const article = container.querySelector('article')!;
    expect(article.textContent).toContain(experience.otherTasks![0].confirmedDescription);
    expect(article.textContent).toContain(candidates[0].label);
    expect(article.textContent).not.toContain(candidates[1].label);
    expect(article.textContent).not.toContain(candidates[2].label);
    expect(article.textContent).toContain(
      'Confirmada por ti · Origen: Instrucción · Experiencia 1 · Tarea 1',
    );
    expect(article.textContent).toContain('Aceptada por ti · Origen: Instrucción · Experiencia 1');
    expect(article.textContent).not.toMatch(/privad[oa]|training-source|instruction/);
    expect(container.querySelector('script, form, button, input, textarea, select')).toBeNull();
    expect(container.querySelector('main a[href="/perfil-profesional"]')?.textContent).toBe(
      'Volver a mi perfil profesional',
    );
    expect(container.querySelector('a[href^="/cv/"], a[download]')).toBeNull();
    expect(data).toEqual(before);
    expect(mocks.from.mock.calls).toEqual([['user_military_profiles']]);
    expect(mocks.select).toHaveBeenCalledExactlyOnceWith('raw_profile_jsonb');
    expect(mocks.eq.mock.calls).toEqual([
      ['user_id', 'authenticated-user'],
      ['is_current', true],
    ]);
    expect(mocks.read).toHaveBeenCalledTimes(1);
    for (const method of ['insert', 'upsert', 'update', 'delete', 'rpc'] as const) {
      expect(mocks[method]).not.toHaveBeenCalled();
    }
  });

  it('matches the professional profile selection and keeps duplicate sources distinct', async () => {
    const second = { ...fixture(), id: 'second-source' };
    const candidate = builder.buildExperienceProposals([second])[0].civilianCompetencyCandidate;
    second.competencyReviews = [
      {
        competencyId: candidate.id,
        evidenceKey: competencyEvidenceKey(candidate),
        decision: 'accepted',
      },
    ];
    storedHistory([fixture(), second]);
    const draft = await renderPage();
    const profile = await renderPage(ProfessionalProfilePage);
    for (const [draftId, profileId] of [
      ['cv-experience', 'professional-experience'],
      ['cv-competencies', 'professional-competencies'],
    ]) {
      const entries = (container: HTMLElement, id: string) =>
        Array.from(container.querySelectorAll(`[aria-labelledby="${id}"] li`), (node) => ({
          source: node.getAttribute('data-source-experience-id'),
          text: node.querySelector(id.startsWith('cv-') ? 'p' : 'p:nth-child(2)')?.textContent,
        }));
      expect(entries(draft, draftId)).toEqual(entries(profile, profileId));
      expect(entries(draft, draftId)).toHaveLength(2);
    }
    const competencies = draft.querySelector('[aria-labelledby="cv-competencies"]')!;
    expect(competencies.textContent).toContain('Experiencia 1');
    expect(competencies.textContent).toContain('Experiencia 2');
    expect(competencies.querySelectorAll('li p:first-child')[0].textContent).toBe(candidate.label);
    expect(competencies.querySelectorAll('li p:first-child')[1].textContent).toBe(candidate.label);
  });

  it('reads changes afresh and excludes changed evidence, foreign reviews and changed labels', async () => {
    expect((await renderPage()).textContent).toContain(candidates[0].label);
    const changed = fixture();
    changed.otherTasks![0].confirmedDescription = 'Confirmación actualizada';
    changed.instructionActivities = ['explained_to_peers'];
    storedHistory([changed]);
    let container = await renderPage();
    expect(container.textContent).toContain('Confirmación actualizada');
    expect(container.textContent).not.toContain(candidates[0].label);
    expect(container.textContent).not.toContain(experience.otherTasks![0].confirmedDescription);
    for (const candidate of [
      { ...candidates[0], label: 'Etiqueta antigua' },
      { ...candidates[0], experienceId: 'foreign-source', id: 'foreign-id' },
    ]) {
      const source = fixture();
      source.competencyReviews = [
        {
          competencyId: candidate.id,
          evidenceKey: competencyEvidenceKey(candidate),
          decision: 'accepted',
        },
      ];
      storedHistory([source]);
      container = await renderPage();
      expect(container.textContent).not.toContain(candidates[0].label);
      expect(container.textContent).toContain('Todavía no tienes competencias aceptadas');
    }
  });

  it.each([
    null,
    { raw_profile_jsonb: {} },
    { raw_profile_jsonb: { careerHistory: { experiences: [] } } },
    {
      raw_profile_jsonb: {
        careerHistory: { experiences: [{ ...experience, otherTasks: undefined }] },
      },
    },
  ])('shows an empty state for missing or pending-only content (%#)', async (data) => {
    mocks.read.mockResolvedValue({ data, error: null });
    const container = await renderPage();
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      'Tu borrador de CV todavía no tiene contenido confirmado',
    );
    expect(container.querySelector('article, [role="alert"]')).toBeNull();
    for (const candidate of candidates)
      expect(container.textContent).not.toContain(candidate.label);
  });

  it('allows accepted-only and confirmed-only content without inferring identity or military rank', async () => {
    storedHistory([{ ...fixture(), otherTasks: undefined }]);
    let container = await renderPage();
    expect(container.textContent).toContain(candidates[0].label);
    expect(container.textContent).toContain('Todavía no has confirmado descripciones');
    storedHistory([
      { id: experience.id, activity: 'reporting', otherTasks: experience.otherTasks },
    ]);
    container = await renderPage();
    expect(container.textContent).toContain(experience.otherTasks![0].confirmedDescription);
    expect(container.textContent).toContain('Reporting · Experiencia 1');
    expect(container.textContent).toContain('Todavía no tienes competencias aceptadas');
    expect(container.querySelector('[role="status"], [role="alert"]')).toBeNull();
  });

  it.each([
    { data: null, error: { code: 'DB_DOWN', message: 'private detail' } },
    { data: null, error: { code: 'PGRST116' } },
    { data: { raw_profile_jsonb: { careerHistory: { experiences: [{}] } } }, error: null },
    {
      data: {
        raw_profile_jsonb: {
          careerHistory: {
            experiences: [{ ...experience, competencyReviews: [{ decision: 'invalid' }] }],
          },
        },
      },
      error: null,
    },
  ])(
    'reports unavailable or invalid history explicitly instead of showing an empty draft (%#)',
    async (response) => {
      mocks.read.mockResolvedValue(response);
      const container = await renderPage();
      expect(container.querySelector('[role="alert"]')).not.toBeNull();
      expect(container.querySelector('article, [role="status"]')).toBeNull();
      expect(container.textContent).not.toContain('private detail');
    },
  );

  it('handles reader and builder failures without exposing details or partial content', async () => {
    mocks.read.mockRejectedValueOnce(new Error('private detail'));
    expect((await renderPage()).querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos leer',
    );
    vi.spyOn(builder, 'buildExperienceProposals').mockImplementationOnce(() => {
      throw new Error('private detail');
    });
    const container = await renderPage();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos comprobar',
    );
    expect(container.querySelector('article, [role="status"]')).toBeNull();
    expect(container.textContent).not.toContain('private detail');
  });

  it('preserves Next control flow', async () => {
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;replace;/login;307;',
    });
    vi.spyOn(builder, 'buildExperienceProposals').mockImplementationOnce(() => {
      throw redirect;
    });
    await expect(CvDraftPage()).rejects.toBe(redirect);
  });

  it('requires authentication before reading with the draft return destination', async () => {
    mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
    await expect(CvDraftPage()).rejects.toMatchObject({
      digest: expect.stringContaining('/login?redirectedFrom=%2Fcv-borrador'),
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
