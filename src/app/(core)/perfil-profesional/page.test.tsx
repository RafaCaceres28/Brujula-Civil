import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { structuredExperienceSchema } from '@/features/translation/schemas/structured-experience.schema';
import { competencyEvidenceKey } from '@/features/translation/services/competency-review';
import * as builder from '@/features/translation/services/experience-proposals.builder';
import CoreLayout from '../layout';
import ProfessionalProfileLoadingPage from './loading';
import ProfessionalProfilePage from './page';

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

const training = structuredExperienceSchema.parse({
  id: 'z-training',
  activity: 'instruction',
  instructionActivities: ['demonstrated', 'explained_to_peers', 'prepared_and_delivered'],
  otherTasks: [
    {
      description: 'Declaración original que no debe publicarse',
      target: 'Objeto original que no debe publicarse',
      confirmedDescription: 'Organicé material para las sesiones prácticas.',
    },
    { description: 'Tarea todavía sin confirmar', target: 'Objeto sin confirmar' },
  ],
});
const maintenance = structuredExperienceSchema.parse({
  id: 'a-maintenance',
  activity: 'op_maintenance',
  maintenanceTasks: [
    {
      material: 'communications_equipment',
      operations: ['communications_cleaning', 'batteries', 'coaxial_repair', 'report_faults'],
    },
  ],
  otherTasks: [
    {
      description: 'Descripción de mantenimiento original',
      target: 'Material declarado',
      confirmedDescription: 'Clasifiqué los materiales de trabajo.',
    },
  ],
});
const trainingCandidates = builder
  .buildExperienceProposals([training])
  .map((proposal) => proposal.civilianCompetencyCandidate);
const maintenanceCandidates = builder
  .buildExperienceProposals([maintenance])
  .map((proposal) => proposal.civilianCompetencyCandidate);

function fixture() {
  return [
    {
      ...structuredClone(training),
      competencyReviews: trainingCandidates.slice(0, 2).map((candidate, index) => ({
        competencyId: candidate.id,
        evidenceKey: competencyEvidenceKey(candidate),
        decision: index === 0 ? ('accepted' as const) : ('discarded' as const),
      })),
    },
    {
      ...structuredClone(maintenance),
      competencyReviews: maintenanceCandidates.map((candidate, index) => ({
        competencyId: candidate.id,
        evidenceKey: index === 2 ? 'obsolete-evidence' : competencyEvidenceKey(candidate),
        decision: 'accepted' as const,
      })),
    },
  ];
}

function storedHistory(experiences: unknown) {
  const data = { raw_profile_jsonb: { careerHistory: { experiences } } };
  mocks.read.mockResolvedValue({ data, error: null });
  return data;
}

async function renderPage() {
  const page = await ProfessionalProfilePage();
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(await CoreLayout({ children: page }));
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
  storedHistory(fixture());
});

describe('007.5d /perfil-profesional: lectura canónica con helpers reales', () => {
  it('shows only confirmed descriptions and currently accepted candidates with precise human origins', async () => {
    const data = storedHistory(fixture());
    const before = structuredClone(data);
    const container = await renderPage();
    expect(container.querySelector('h1')?.textContent).toBe('Mi perfil profesional civil');
    expect(Array.from(container.querySelectorAll('h2'), (node) => node.textContent)).toEqual([
      'Experiencia profesional',
      'Competencias profesionales',
    ]);
    const descriptions = container.querySelector('[aria-labelledby="professional-experience"]')!;
    expect(descriptions.textContent).toContain(training.otherTasks![0].confirmedDescription);
    expect(descriptions.textContent).toContain(maintenance.otherTasks![0].confirmedDescription);
    expect(descriptions.textContent).toContain('2 descripciones confirmadas por ti');
    expect(descriptions.textContent).toContain('Confirmada por ti');
    expect(descriptions.textContent).toContain('Origen: Instrucción · Experiencia 1 · Tarea 1');
    expect(descriptions.textContent).toContain(
      'Origen: Mantenimiento y Puesta a Punto · Experiencia 2 · Tarea 1',
    );
    const competencies = container.querySelector('[aria-labelledby="professional-competencies"]')!;
    expect(competencies.textContent).toContain(trainingCandidates[0].label);
    expect(competencies.textContent).toContain(maintenanceCandidates[0].label);
    expect(competencies.textContent).toContain(maintenanceCandidates[1].label);
    expect(competencies.textContent).toContain('3 aceptaciones vigentes');
    expect(competencies.textContent).toContain('Aceptada por ti');
    expect(competencies.textContent).not.toContain(trainingCandidates[1].label);
    expect(competencies.textContent).not.toContain(trainingCandidates[2].label);
    expect(competencies.textContent).not.toContain(maintenanceCandidates[2].label);
    expect(competencies.querySelector('li')?.textContent).toContain('Instrucción · Experiencia 1');
    expect(container.textContent).not.toContain('Declaración original');
    expect(container.textContent).not.toContain('Objeto original');
    expect(container.textContent).not.toContain('Tarea todavía sin confirmar');
    expect(container.textContent).not.toContain('Objeto sin confirmar');
    expect(container.textContent).not.toContain('op_maintenance');
    expect(container.textContent).not.toContain(training.id);
    expect(container.querySelector('li[data-source-experience-id="z-training"]')).not.toBeNull();
    expect(container.querySelector('li[data-source-experience-id="a-maintenance"]')).not.toBeNull();
    expect(container.textContent).toContain('Solo lectura');
    expect(container.textContent).toContain(
      'Información revisada por ti. No acredita titulaciones ni habilitaciones profesionales.',
    );
    expect(container.querySelector('form, button, input, textarea, select')).toBeNull();
    expect(container.querySelector('main a[href="/traduccion"]')?.textContent).toContain(
      'Revisar en Traducción',
    );
    expect(container.querySelector('a[href="/experiencia-profesional"]')?.textContent).toBe(
      'Gestionar experiencia profesional',
    );
    expect(data).toEqual(before);
    expect(mocks.from.mock.calls).toEqual([['user_military_profiles']]);
    expect(mocks.select).toHaveBeenCalledExactlyOnceWith('raw_profile_jsonb');
    expect(mocks.eq.mock.calls).toEqual([
      ['user_id', 'authenticated-user'],
      ['is_current', true],
    ]);
    for (const method of ['insert', 'upsert', 'update', 'delete', 'rpc'] as const) {
      expect(mocks[method]).not.toHaveBeenCalled();
    }
  });

  it('reads edits afresh, shows confirmed text directly, and invalidates an acceptance after evidence changes', async () => {
    const experiences = fixture();
    storedHistory(experiences);
    expect((await renderPage()).textContent).toContain(maintenanceCandidates[0].label);
    experiences[0].otherTasks![0].confirmedDescription =
      'Texto confirmado actualizado <script>x</script>';
    experiences[1].maintenanceTasks![0].operations = ['communications_cleaning'];
    storedHistory(experiences);
    const container = await renderPage();
    expect(container.textContent).toContain('Texto confirmado actualizado <script>x</script>');
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).not.toContain(training.otherTasks![0].confirmedDescription);
    expect(container.textContent).not.toContain(maintenanceCandidates[0].label);
    expect(container.textContent).toContain('1 aceptaciones vigentes');
    expect(container.textContent).toContain(trainingCandidates[0].label);
  });

  it('does not accept changed labels, foreign source reviews, or candidates no longer generated', async () => {
    const experiences = fixture();
    const candidate = trainingCandidates[0];
    experiences[0].competencyReviews = [
      {
        competencyId: candidate.id,
        evidenceKey: competencyEvidenceKey({ ...candidate, label: 'Etiqueta antigua' }),
        decision: 'accepted',
      },
    ];
    experiences[1].competencyReviews = [
      {
        competencyId: candidate.id,
        evidenceKey: competencyEvidenceKey(candidate),
        decision: 'accepted',
      },
    ];
    storedHistory(experiences);
    const container = await renderPage();
    expect(container.textContent).not.toContain(candidate.label);
    expect(container.textContent).toContain('0 aceptaciones vigentes');
    expect(container.textContent).not.toContain('Tu perfil profesional todavía no tiene contenido');
    delete experiences[0].instructionActivities;
    experiences[0].competencyReviews[0].evidenceKey = competencyEvidenceKey(candidate);
    storedHistory(experiences);
    expect((await renderPage()).textContent).not.toContain(candidate.label);
  });

  it('keeps duplicate competency labels from different sources distinct with shared source numbering', async () => {
    const first = fixture()[0];
    const second = { ...structuredClone(first), id: 'second-training' };
    const candidate = builder.buildExperienceProposals([second])[0].civilianCompetencyCandidate;
    second.competencyReviews = [
      {
        competencyId: candidate.id,
        evidenceKey: competencyEvidenceKey(candidate),
        decision: 'accepted',
      },
    ];
    storedHistory([first, second]);
    const container = await renderPage();
    const competencies = container.querySelector('[aria-labelledby="professional-competencies"]')!;
    const entries = Array.from(competencies.querySelectorAll('li'));
    expect(entries).toHaveLength(2);
    expect(entries[0].textContent).toContain('Instrucción · Experiencia 1');
    expect(entries[1].textContent).toContain('Instrucción · Experiencia 2');
    expect(entries.every((entry) => entry.textContent?.includes(candidate.label))).toBe(true);
    expect(competencies.textContent).toContain('2 aceptaciones vigentes');
  });

  it('shows confirmed descriptions for activities without builder proposals without a second acceptance', async () => {
    storedHistory([
      { id: training.id, activity: 'reporting', otherTasks: structuredClone(training.otherTasks) },
    ]);
    const container = await renderPage();
    expect(container.textContent).toContain(training.otherTasks![0].confirmedDescription);
    expect(container.textContent).toContain('Origen: Reporting · Experiencia 1');
    expect(container.textContent).toContain('0 aceptaciones vigentes');
  });

  it('shows a section empty state when only accepted competencies exist', async () => {
    const experiences = fixture().map((experience) => ({ ...experience, otherTasks: undefined }));
    storedHistory(experiences);
    const container = await renderPage();
    expect(container.textContent).toContain('Todavía no has confirmado descripciones');
    expect(container.textContent).toContain('3 aceptaciones vigentes');
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it.each([
    null,
    { raw_profile_jsonb: {} },
    { raw_profile_jsonb: { careerHistory: { experiences: [] } } },
    {
      raw_profile_jsonb: {
        careerHistory: { experiences: [{ ...training, otherTasks: undefined }] },
      },
    },
  ])('renders missing or unreviewed history as empty without creating data (%#)', async (data) => {
    mocks.read.mockResolvedValue({ data, error: null });
    const container = await renderPage();
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      'Tu perfil profesional todavía no tiene contenido confirmado',
    );
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain('Todavía no has confirmado descripciones');
    expect(container.textContent).toContain('Todavía no tienes competencias aceptadas');
    for (const method of ['insert', 'upsert', 'update', 'delete', 'rpc'] as const) {
      expect(mocks[method]).not.toHaveBeenCalled();
    }
  });

  it.each([
    { data: null, error: { code: 'DB_DOWN', message: 'private database detail' } },
    { data: { raw_profile_jsonb: { careerHistory: { experiences: [{}] } } }, error: null },
    {
      data: {
        raw_profile_jsonb: {
          careerHistory: {
            experiences: [{ ...training, competencyReviews: [{ decision: 'verified' }] }],
          },
        },
      },
      error: null,
    },
  ])(
    'shows safe errors, never an empty profile, for unavailable or corrupt data (%#)',
    async (response) => {
      mocks.read.mockResolvedValue(response);
      const container = await renderPage();
      expect(container.querySelector('[role="alert"]')).not.toBeNull();
      expect(container.querySelector('[role="status"]')).toBeNull();
      expect(container.textContent).not.toContain('private database detail');
      expect(container.textContent).not.toContain(
        'Tu perfil profesional todavía no tiene contenido',
      );
    },
  );

  it('handles reader exceptions safely and builder failures explicitly', async () => {
    mocks.read.mockRejectedValueOnce(new Error('private stored text'));
    let container = await renderPage();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('No pudimos leer');
    expect(container.textContent).not.toContain('private stored text');
    vi.spyOn(builder, 'buildExperienceProposals').mockImplementationOnce(() => {
      throw new Error('private builder detail');
    });
    container = await renderPage();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos comprobar las competencias vigentes',
    );
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.textContent).not.toContain('private builder detail');
  });

  it('preserves Next control-flow exceptions instead of showing a domain error', async () => {
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;replace;/login;307;',
    });
    vi.spyOn(builder, 'buildExperienceProposals').mockImplementationOnce(() => {
      throw redirect;
    });
    await expect(ProfessionalProfilePage()).rejects.toBe(redirect);
  });

  it('requires authentication before history access and retains the intended destination', async () => {
    mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
    await expect(ProfessionalProfilePage()).rejects.toMatchObject({
      digest: expect.stringContaining('/login?redirectedFrom=%2Fperfil-profesional'),
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('adds one professional profile link to the shared responsive navigation', async () => {
    const container = await renderPage();
    const links = container.querySelectorAll('aside nav a[href="/perfil-profesional"]');
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toBe('Perfil profesional');
    expect(container.querySelector('aside nav a[href="/perfil"]')).not.toBeNull();
    expect(container.querySelector('aside nav a[href="/traduccion"]')).not.toBeNull();
  });

  it('offers an accessible loading state without reads or writes', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(<ProfessionalProfileLoadingPage />);
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      'Estamos leyendo tu contenido confirmado',
    );
    expect(mocks.client).not.toHaveBeenCalled();
  });
});
