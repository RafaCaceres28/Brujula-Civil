import { readFileSync } from 'node:fs';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { structuredExperienceSchema } from '@/features/translation/schemas/structured-experience.schema';
import { competencyEvidenceKey } from '@/features/translation/services/competency-review';
import * as builder from '@/features/translation/services/experience-proposals.builder';
import CoreLayout from '../layout';
import ProfessionalProfilePage from '../perfil-profesional/page';
import CvDraftPage from './page';
import { PrintCvButton } from './print-cv-button';
import styles from './cv-draft.module.css';

const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  auth: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  read: vi.fn(),
  readContact: vi.fn(),
  readEducation: vi.fn(),
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
  mocks.readContact.mockResolvedValue({ data: null, error: null });
  mocks.readEducation.mockResolvedValue({ data: null, error: null });
  mocks.from.mockImplementation((table: string) =>
    table === 'app_user_profiles'
      ? {
          select: (columns: string) => ({
            eq: () => ({
              maybeSingle: columns.includes('academic_education_jsonb')
                ? mocks.readEducation
                : mocks.readContact,
            }),
          }),
        }
      : query,
  );
  mocks.select.mockReturnValue(query);
  mocks.eq.mockReturnValue(query);
  mocks.client.mockResolvedValue({
    auth: { getUser: mocks.auth },
    from: mocks.from,
    rpc: mocks.rpc,
  });
  storedHistory([fixture()]);
});

describe('007.5j /cv-borrador: impresión nativa', () => {
  it('renders a native button without printing and prints exactly once per click', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<PrintCvButton />));
      const button = container.querySelector('button')!;
      expect(button.textContent).toBe('Guardar como PDF');
      expect(button.type).toBe('button');
      expect(button.disabled).toBe(false);
      expect(button.tabIndex).toBe(0);
      expect(print).not.toHaveBeenCalled();
      await act(async () => button.click());
      expect(print).toHaveBeenCalledTimes(1);
      await act(async () => button.click());
      expect(print).toHaveBeenCalledTimes(2);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('does not print during server rendering', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    expect(renderToStaticMarkup(<PrintCvButton />)).toContain('Guardar como PDF');
    expect(print).not.toHaveBeenCalled();
  });

  it('keeps the button and instructions outside the document in the print-hidden wrapper', async () => {
    const container = await renderPage();
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    const button = buttons[0];
    expect(button.textContent).toBe('Guardar como PDF');
    expect(button.closest('article')).toBeNull();
    const wrapper = button.closest(`.${styles.screenOnly}`)!;
    expect(wrapper).not.toBeNull();
    expect(wrapper.textContent).toContain('En el diálogo de impresión, elige Guardar como PDF');
    expect(wrapper.querySelector('article')).toBeNull();
    const css = readFileSync('src/app/(core)/cv-borrador/cv-draft.module.css', 'utf8');
    expect(css.slice(css.indexOf('@media print'))).toMatch(/\.screenOnly\s*\{\s*display: none;/);
  });
});

describe('007.5h /cv-borrador: presentación del documento', () => {
  it('orders actual contact, experience, education and competencies in one document', async () => {
    mocks.readContact.mockResolvedValue({
      data: {
        display_name: 'Ana García',
        phone: '+34 600 100 200',
        contact_email: 'trabajo@example.test',
        locality_province: 'Sevilla',
      },
      error: null,
    });
    mocks.readEducation.mockResolvedValue({
      data: {
        academic_education_jsonb: [
          {
            id: 'study-1',
            title: 'Estudios declarados',
            institution: 'Centro',
            status: 'in_progress',
            year: 2030,
          },
        ],
      },
      error: null,
    });
    const container = await renderPage();
    const article = container.querySelector('article')!;
    expect(Array.from(article.children, (node) => node.tagName)).toEqual([
      'HEADER',
      'SECTION',
      'SECTION',
      'SECTION',
    ]);
    expect(
      Array.from(article.querySelectorAll('section > h2'), (node) => node.textContent),
    ).toEqual(['Experiencia profesional', 'Formación académica', 'Competencias profesionales']);
    expect(article.querySelector('header h2')?.textContent).toBe('Ana García');
    expect(article.querySelector('address')?.textContent).toContain('trabajo@example.test');
    expect(article.textContent).toContain('Finalización prevista: 2030');
    expect(article.querySelector('a, button, [role="alert"], [role="status"], details')).toBeNull();
    expect(article.textContent).not.toMatch(/Solo lectura|Origen:|pendiente|No acredita|Editar/);
    expect(
      container.querySelector('[aria-labelledby="cv-missing-data"]')?.closest('article'),
    ).toBeNull();
    expect(container.querySelector('details')?.closest('article')).toBeNull();
  });

  it('shows education alone without placeholder identity or empty professional sections', async () => {
    mocks.read.mockResolvedValue({ data: null, error: null });
    mocks.readEducation.mockResolvedValue({
      data: {
        academic_education_jsonb: [
          { id: 'study-1', title: 'Estudios declarados', status: 'completed' },
        ],
      },
      error: null,
    });
    const container = await renderPage();
    const article = container.querySelector('article')!;
    expect(article.querySelectorAll('section')).toHaveLength(1);
    expect(article.querySelector('header, #cv-experience, #cv-competencies')).toBeNull();
    expect(article.textContent).toContain('Estudios declarados');
    expect(article.textContent).toContain('Finalizado');
    expect(article.textContent).not.toMatch(/Borrador|No has|todavía|pendiente|Origen:/i);
    expect(container.querySelector('[role="status"]')?.closest('article')).toBeNull();
  });

  it('keeps missing sections and read errors outside a contact-only document', async () => {
    mocks.readContact.mockResolvedValue({
      data: { display_name: 'Ana', phone: null, contact_email: null, locality_province: null },
      error: null,
    });
    mocks.read.mockResolvedValue({ data: null, error: { code: 'DOWN' } });
    mocks.readEducation.mockResolvedValue({ data: null, error: { code: 'DOWN' } });
    const container = await renderPage();
    const article = container.querySelector('article')!;
    expect(article.textContent).toBe('Ana');
    expect(article.querySelector('section, [role="alert"]')).toBeNull();
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(2);
    expect(container.querySelector('a[href="/formacion"]')?.closest('article')).toBeNull();
  });

  it('preserves long confirmed text and paragraph spacing without splitting or shortening it', async () => {
    const source = fixture();
    const text = `${'Descripción confirmada completa. '.repeat(8)}\n\n${'TextoSinEspacios'.repeat(8)}`;
    source.otherTasks![0].confirmedDescription = text;
    storedHistory([source]);
    const container = await renderPage();
    expect(container.querySelector('[aria-labelledby="cv-experience"] li p')?.textContent).toBe(
      text,
    );
    expect(container.querySelectorAll('[aria-labelledby="cv-experience"] li')).toHaveLength(1);
  });
});

describe('007.5i /cv-borrador: experiencia agrupada', () => {
  it('groups by stable source ID in history order, keeping task order and duplicate texts', async () => {
    const first = fixture();
    first.id = 'z-first';
    first.otherTasks = [
      { description: 'Privada', target: 'Privado', confirmedDescription: 'Primera descripción' },
      { description: 'Pendiente privada', target: 'Privado' },
      {
        description: 'Otra privada',
        target: 'Privado',
        confirmedDescription: 'Segunda descripción',
      },
      {
        description: 'Repetida privada',
        target: 'Privado',
        confirmedDescription: 'Primera descripción',
      },
    ];
    const second = { ...fixture(), id: 'a-second' };
    const withoutDescriptions = { ...fixture(), id: 'no-descriptions', otherTasks: undefined };
    storedHistory([first, withoutDescriptions, second]);
    const container = await renderPage();
    const section = container.querySelector('[aria-labelledby="cv-experience"]')!;
    const groups = Array.from(section.querySelectorAll(':scope > div[data-source-experience-id]'));
    expect(groups.map((group) => group.getAttribute('data-source-experience-id'))).toEqual([
      'z-first',
      'a-second',
    ]);
    for (const group of groups) {
      expect(group.querySelector('h3')?.textContent).toBe('Actividad declarada: Instrucción');
      expect(group.getAttribute('aria-labelledby')).toBe(group.querySelector('h3')?.id);
    }
    expect(Array.from(groups[0].querySelectorAll('li p'), (node) => node.textContent)).toEqual([
      'Primera descripción',
      'Segunda descripción',
      'Primera descripción',
    ]);
    expect(groups[1].querySelector('li p')?.textContent).toBe(
      experience.otherTasks![0].confirmedDescription,
    );
    expect(section.textContent).not.toMatch(/privad[oa]|Empresa|Cargo|z-first|a-second/);
    expect(section.querySelector('script')).toBeNull();
  });

  it.each([
    ['less_than_1_year', 'Menos de un año'],
    ['one_to_five_years', 'Entre 1 y 5 años'],
    ['more_than_5_years', 'Más de 5 años'],
    ['not_sure', null],
    [undefined, null],
  ] as const)('shows only an informed approximate duration (%s)', async (durationRange, label) => {
    storedHistory([{ ...fixture(), durationRange, frequency: 'by_periods' }]);
    const container = await renderPage();
    const section = container.querySelector('[aria-labelledby="cv-experience"]')!;
    const duration = section.querySelector('h3 + p');
    if (label) {
      expect(duration?.textContent).toBe(
        `Periodo aproximado de actividad: ${label}. No indica dedicación continua.`,
      );
    } else {
      expect(duration).toBeNull();
      expect(section.textContent).not.toMatch(/Periodo|No lo recuerdo|not_sure/);
    }
    expect(section.textContent).not.toMatch(/\b(?:19|20)\d{2}\b|actualidad|jornada completa/i);
  });

  it('keeps accepted competencies independent without creating an empty experience group', async () => {
    storedHistory([{ ...fixture(), otherTasks: undefined, durationRange: 'one_to_five_years' }]);
    const container = await renderPage();
    expect(container.querySelector('[aria-labelledby="cv-experience"]')).toBeNull();
    expect(container.querySelector('[aria-labelledby="cv-competencies"]')?.textContent).toContain(
      candidates[0].label,
    );
    expect(container.querySelector('article')?.textContent).not.toContain('Periodo aproximado');
  });
});

describe('007.5e /cv-borrador: contenido confirmado de solo lectura', () => {
  it('shows declared academic studies independently, with explicit ongoing labels and escaped text', async () => {
    mocks.readEducation.mockResolvedValue({
      data: {
        academic_education_jsonb: [
          {
            id: 'study-1',
            title: 'Título <script>no ejecutar</script>',
            institution: 'Centro',
            year: 2020,
            status: 'completed',
          },
          {
            id: 'study-2',
            title: 'Estudios actuales',
            institution: null,
            year: 2030,
            status: 'in_progress',
          },
          { id: 'study-3', title: 'Sin año', status: 'in_progress' },
        ],
      },
      error: null,
    });
    mocks.read.mockResolvedValue({ data: null, error: { code: 'DB_DOWN' } });
    const container = await renderPage();
    const section = container.querySelector('[aria-labelledby="cv-education"]')!;
    expect(section.querySelector('h2')?.textContent).toBe('Formación académica');
    expect(section.querySelectorAll('li')).toHaveLength(3);
    expect(section.textContent).toContain('Título <script>no ejecutar</script>');
    expect(section.textContent).toContain('Finalizado');
    expect(section.textContent).toContain('2020');
    expect(section.textContent).toContain('En curso');
    expect(section.textContent).toContain('Finalización prevista: 2030');
    expect(section.textContent).not.toMatch(/obtenid|acreditad/i);
    expect(section.querySelector('script')).toBeNull();
    expect(container.textContent).not.toContain('Formación todavía no incorporada');
    expect(container.querySelector('a[href="/formacion"]')).not.toBeNull();
  });
  it.each([null, []])(
    'offers registration for absent or explicitly empty education (%j)',
    async (academic_education_jsonb) => {
      mocks.readEducation.mockResolvedValue({ data: { academic_education_jsonb }, error: null });
      const container = await renderPage();
      expect(container.querySelector('[aria-labelledby="cv-education"]')).toBeNull();
      expect(container.textContent).toContain('No has registrado estudios');
      expect(container.querySelector('a[href="/formacion"]')?.textContent).toBe(
        'Registrar estudios',
      );
      expect(container.querySelector('article')?.textContent).not.toContain('No has registrado');
    },
  );
  it.each([
    { data: { academic_education_jsonb: [{}] }, error: null },
    { data: null, error: { code: 'DOWN', message: 'private detail' } },
  ])('reports education failures without hiding contacts or history (%#)', async (response) => {
    mocks.readEducation.mockResolvedValue(response);
    const container = await renderPage();
    expect(container.querySelector('[aria-labelledby="cv-education"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).not.toContain('No has registrado estudios');
    expect(container.querySelector('article')?.textContent).toContain(candidates[0].label);
    expect(container.querySelector('article [role="alert"]')).toBeNull();
    expect(container.textContent).not.toContain('private detail');
  });
  it('shows only stored contact fields, escapes text and reads fresh contact data', async () => {
    mocks.readContact.mockResolvedValue({
      data: {
        display_name: 'Ana <script>no ejecutar</script>',
        phone: '+34 600 100 200',
        contact_email: 'trabajo@example.test',
        locality_province: 'Sevilla, Sevilla',
      },
      error: null,
    });
    let container = await renderPage();
    const header = container.querySelector('[aria-label="Cabecera del borrador de CV"]')!;
    expect(header.textContent).toContain('Ana <script>no ejecutar</script>');
    expect(header.textContent).toContain('trabajo@example.test');
    expect(header.textContent).toContain('Sevilla, Sevilla');
    expect(header.querySelector('script')).toBeNull();
    expect(header.querySelector('a')).toBeNull();
    expect(container.querySelector('a[href="/datos-contacto"]')).not.toBeNull();
    mocks.readContact.mockResolvedValue({
      data: { display_name: 'Ana', phone: null, contact_email: null, locality_province: null },
      error: null,
    });
    container = await renderPage();
    expect(container.textContent).not.toContain('trabajo@example.test');
    expect(container.textContent).not.toContain('+34 600 100 200');
    expect(
      container.querySelector('[aria-labelledby="cv-missing-data"]')?.textContent,
    ).not.toContain('no incluye nombre');
  });

  it('keeps confirmed history when contact reading fails, without inventing identity', async () => {
    mocks.readContact.mockResolvedValue({
      data: null,
      error: { code: 'DB_DOWN', message: 'private detail' },
    });
    const container = await renderPage();
    expect(container.querySelector('article')?.textContent).toContain(candidates[0].label);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudieron leer tus datos de contacto',
    );
    expect(container.querySelector('[aria-label="Cabecera del borrador de CV"]')).toBeNull();
    expect(container.querySelector('article [role="alert"]')).toBeNull();
    expect(container.textContent).not.toContain('private detail');
  });

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
      expect(container.querySelector('[aria-labelledby="cv-education"]')).toBeNull();
      expect(container.textContent).toContain('No has registrado estudios');
      expect(notice.textContent).toContain('no se utiliza tu email de acceso ni se inventan datos');
      expect(notice.textContent).toContain(
        'esa parte del CV queda pendiente; no se inventa experiencia',
      );
      expect(mocks.from.mock.calls).toEqual([
        ['user_military_profiles'],
        ['app_user_profiles'],
        ['app_user_profiles'],
      ]);
      expect(container.querySelector('form, input, textarea, select, a[download]')).toBeNull();
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
    expect(container.textContent).toContain(
      'Confirmada por ti · Origen: Instrucción · Experiencia 1 · Tarea 1',
    );
    expect(container.textContent).toContain(
      'Aceptada por ti · Origen: Instrucción · Experiencia 1',
    );
    expect(article.textContent).not.toMatch(/Confirmada por ti|Aceptada por ti|Origen:/);
    expect(article.textContent).not.toMatch(/privad[oa]|training-source|instruction/);
    expect(container.querySelector('script, form, input, textarea, select')).toBeNull();
    expect(container.querySelector('main a[href="/perfil-profesional"]')?.textContent).toBe(
      'Volver a mi perfil profesional',
    );
    expect(container.querySelector('a[href^="/cv/"], a[download]')).toBeNull();
    expect(data).toEqual(before);
    expect(mocks.from.mock.calls).toEqual([
      ['user_military_profiles'],
      ['app_user_profiles'],
      ['app_user_profiles'],
    ]);
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
    expect(draft.querySelector('details')?.textContent).toContain('Experiencia 1');
    expect(draft.querySelector('details')?.textContent).toContain('Experiencia 2');
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
