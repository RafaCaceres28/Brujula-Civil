import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { saveExperience } from './save-experience';
import { saveProfile } from './save-profile';
import { projectWizardToProfiles } from './project-wizard-to-profiles';
import { getProfile } from './get-profile';
import { profileClientFixture } from './profile-client.test-helper';
import { buildExperienceProposals } from '../../translation/services/experience-proposals.builder';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

const experience = { id: 'exp-1', activity: 'op_maintenance' };
const create = { operation: 'create', experience };
const draft = {
  userId: 'user-1',
  profile: { fullName: 'Synthetic', email: 'synthetic@example.test' },
  militaryBackground: {},
  civilianTarget: {},
};
const full = {
  ...experience,
  stageIds: ['stage-1'],
  equipment: 'office_suite',
  context: ' Taller ',
  result: 'Operativo',
  autonomy: 'supervised',
};
const history = { stages: [{ id: 'stage-1', focus: 'technical' }], experiences: [full] };

function setup(raw: unknown = {}) {
  const mock = profileClientFixture(raw);
  vi.mocked(createClient).mockResolvedValue(mock.client as never);
  return mock;
}

describe('experience commands and shared writer CAS', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves and reloads maintenance declarations into the real builder; same create is idempotent, changed tasks conflict', async () => {
    const mock = setup({ metadata: { keep: true } });
    mock.rows.app_user_profiles.push({
      user_id: 'user-1',
      display_name: 'Synthetic',
      email: 'synthetic@example.test',
    });
    const declared = {
      ...experience,
      maintenanceTasks: [
        { material: 'communications_equipment', operations: ['coaxial_repair'] },
        { material: 'light_vehicles' },
      ],
    };
    const command = { operation: 'create', experience: declared };
    expect(await saveExperience('user-1', command)).toMatchObject({
      ok: true,
      data: { experience: declared },
    });
    expect(await saveExperience('user-1', command)).toMatchObject({ ok: true });
    expect(
      await saveExperience('user-1', {
        ...command,
        experience: {
          ...declared,
          maintenanceTasks: [
            { material: 'communications_equipment', operations: ['antenna_repair'] },
          ],
        },
      }),
    ).toMatchObject({ error: { code: 'CONFLICT' } });
    const reloaded = (await getProfile('user-1'))!.careerHistory!.experiences;
    expect(reloaded).toEqual([declared]);
    expect(buildExperienceProposals(reloaded)).toMatchObject([
      {
        experienceId: experience.id,
        cvDescription: { text: 'Reparación de cableado coaxial en equipos de comunicaciones.' },
      },
    ]);
    expect(mock.calls.filter((call) => call.operation === 'update')).toHaveLength(1);
  });

  it('edits and explicitly clears tasks while preserving sibling experiences, raw metadata and all hidden fields', async () => {
    const tasks = [{ material: 'light_vehicles', operations: ['levels_functioning'] }];
    const stored = { ...full, context: 'Taller', maintenanceTasks: tasks };
    const sibling = {
      ...experience,
      id: 'sibling',
      maintenanceTasks: [{ material: 'communications_equipment' }],
    };
    const raw = {
      metadata: { nested: ['keep'] },
      careerHistory: { ...history, experiences: [stored, sibling] },
    };
    const mock = setup(raw);
    const edited = { ...stored, maintenanceTasks: [{ material: 'light_vehicles' }] };
    expect(
      await saveExperience('user-1', {
        operation: 'edit',
        id: stored.id,
        expectedExperience: stored,
        set: { maintenanceTasks: edited.maintenanceTasks },
      }),
    ).toMatchObject({ ok: true, data: { experience: edited } });
    expect(mock.calls.find((call) => call.operation === 'update')?.filters.rawGuard).toEqual(raw);
    expect(
      await saveExperience('user-1', {
        operation: 'edit',
        id: stored.id,
        expectedExperience: stored,
        set: { frequency: 'occasional' },
      }),
    ).toMatchObject({ error: { code: 'CONFLICT' } });
    expect(
      await saveExperience('user-1', {
        operation: 'edit',
        id: stored.id,
        expectedExperience: edited,
        set: { activity: 'analysis' },
      }),
    ).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect(
      await saveExperience('user-1', {
        operation: 'edit',
        id: stored.id,
        expectedExperience: edited,
        set: { activity: 'analysis' },
        clear: ['maintenanceTasks'],
      }),
    ).toMatchObject({ ok: true });
    const cleared = { ...stored, activity: 'analysis' } as Partial<typeof stored>;
    delete cleared.maintenanceTasks;
    expect(mock.rows.user_military_profiles[0].raw_profile_jsonb).toEqual({
      ...raw,
      careerHistory: { ...history, experiences: [cleared, sibling] },
    });
    expect(mock.calls.filter((call) => call.operation === 'update')).toHaveLength(2);
  });

  it('includes task changes in the full snapshot CAS race without modifying the CAS writer', async () => {
    const stored = {
      ...experience,
      maintenanceTasks: [{ material: 'light_vehicles', operations: ['levels_functioning'] }],
    };
    const mock = setup({ careerHistory: { experiences: [stored] } });
    mock.control.beforeUpdate = async () => {
      expect(
        await saveExperience('user-1', {
          operation: 'edit',
          id: stored.id,
          expectedExperience: stored,
          set: {
            maintenanceTasks: [{ material: 'communications_equipment', operations: ['batteries'] }],
          },
        }),
      ).toMatchObject({ ok: true });
    };
    expect(
      await saveExperience('user-1', {
        operation: 'edit',
        id: stored.id,
        expectedExperience: stored,
        set: { maintenanceTasks: [{ material: 'light_vehicles' }] },
      }),
    ).toMatchObject({ error: { code: 'CONFLICT' } });
    expect(mock.rows.user_military_profiles[0].raw_profile_jsonb).toEqual({
      careerHistory: {
        experiences: [
          {
            ...experience,
            maintenanceTasks: [{ material: 'communications_equipment', operations: ['batteries'] }],
          },
        ],
      },
    });
  });

  it.each([
    {
      ...create,
      experience: {
        ...experience,
        activity: 'analysis',
        maintenanceTasks: [{ material: 'light_vehicles' }],
      },
    },
    {
      ...create,
      experience: {
        ...experience,
        maintenanceTasks: [{ material: 'light_vehicles', operations: ['coaxial_repair'] }],
      },
    },
    {
      operation: 'edit',
      id: experience.id,
      expectedExperience: experience,
      set: {
        maintenanceTasks: [
          { material: 'communications_equipment', operations: ['levels_functioning'] },
        ],
      },
    },
    {
      operation: 'edit',
      id: experience.id,
      expectedExperience: experience,
      set: { maintenanceTasks: [] },
    },
  ])('rejects forged task commands before accessing storage: %j', async (command) => {
    const mock = setup();
    expect(await saveExperience('user-1', command)).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(createClient).not.toHaveBeenCalled();
    expect(mock.calls).toEqual([]);
  });

  it('creates, reloads and repeats the same create without duplicates; differing payload conflicts', async () => {
    const mock = setup({ metadata: { keep: true } });
    mock.rows.app_user_profiles.push({
      user_id: 'user-1',
      display_name: 'Synthetic',
      email: 'synthetic@example.test',
    });
    expect(await saveExperience('user-1', create)).toMatchObject({
      ok: true,
      data: { experience },
    });
    expect(await saveExperience('user-1', create)).toMatchObject({ ok: true });
    expect(
      await saveExperience('user-1', {
        ...create,
        experience: { ...experience, autonomy: 'autonomous' },
      }),
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(mock.rows.user_military_profiles[0].raw_profile_jsonb).toEqual({
      metadata: { keep: true },
      careerHistory: { experiences: [experience] },
    });
    expect((await getProfile('user-1'))?.careerHistory).toEqual({ experiences: [experience] });
  });

  it('patches visible fields, clears explicitly, preserves all hidden fields and exact original raw guard', async () => {
    const raw = { metadata: { nested: ['keep'] }, careerHistory: history };
    const mock = setup(raw);
    const expectedExperience = { ...full, context: 'Taller' };
    expect(
      await saveExperience('user-1', {
        operation: 'edit',
        id: 'exp-1',
        expectedExperience,
        set: { frequency: 'by_periods' },
        clear: ['autonomy'],
      }),
    ).toMatchObject({ ok: true });
    const kept: Partial<typeof full> = { ...full };
    delete kept.autonomy;
    expect(mock.rows.user_military_profiles[0].raw_profile_jsonb).toEqual({
      metadata: raw.metadata,
      careerHistory: { ...history, experiences: [{ ...kept, frequency: 'by_periods' }] },
    });
    expect(mock.calls.find((call) => call.operation === 'update')?.filters).toEqual({
      id: 'mil-1',
      user_id: 'user-1',
      is_current: true,
      rawGuard: raw,
    });
  });

  it.each([
    { operation: 'edit', id: 'exp-1', set: { activity: 'op_maintenance' } },
    { ...create, userId: 'other' },
    { ...create, experience: { ...experience, context: 'not owned' } },
    { operation: 'edit', id: 'exp-1', expectedExperience: experience, clear: ['activity'] },
    {
      operation: 'edit',
      id: 'exp-1',
      expectedExperience: experience,
      set: { autonomy: 'supervised' },
      clear: ['autonomy'],
    },
  ])('rejects invalid commands before client/write: %j', async (command) => {
    const mock = setup();
    expect(await saveExperience('user-1', command)).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(createClient).not.toHaveBeenCalled();
    expect(mock.calls).toEqual([]);
  });

  it('distinguishes missing edit from stale baseline without any writes', async () => {
    const mock = setup({ careerHistory: { experiences: [experience] } });
    expect(
      await saveExperience('user-1', {
        operation: 'edit',
        id: 'missing',
        expectedExperience: { ...experience, id: 'missing' },
        set: {},
      }),
    ).toMatchObject({ error: { code: 'NOT_FOUND' } });
    expect(
      await saveExperience('user-1', {
        operation: 'edit',
        id: 'exp-1',
        expectedExperience: { ...experience, autonomy: 'autonomous' },
        set: {},
      }),
    ).toMatchObject({ error: { code: 'CONFLICT' } });
    expect(mock.calls.every((call) => call.operation === 'select')).toBe(true);
  });

  it.each([{}, { careerHistory: { experiences: [] } }])(
    'creates from absent/empty history: %j',
    async (raw) => {
      setup(raw);
      expect(await saveExperience('user-1', create)).toMatchObject({ ok: true });
    },
  );

  it.each([
    [],
    { careerHistory: null },
    { careerHistory: { experiences: [{ ...experience, stageIds: ['missing'] }] } },
  ])('blocks corrupt existing raw without writes: %j', async (raw) => {
    const mock = setup(raw);
    expect(await saveExperience('user-1', create)).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(mock.calls.every((call) => call.operation === 'select')).toBe(true);
  });

  it.each(['select', 'update', 'insert'] as const)(
    'maps %s storage failure without leaking provider details',
    async (operation) => {
      const mock = setup();
      if (operation === 'insert') mock.rows.user_military_profiles = [];
      mock.control.error = { table: 'user_military_profiles', operation };
      expect(await saveExperience('user-1', create)).toMatchObject({
        ok: false,
        error: { code: 'EXTERNAL_DEPENDENCY_ERROR', message: 'No se pudo guardar la experiencia' },
      });
    },
  );

  it('treats zero returned rows as conflict, not success', async () => {
    const mock = setup();
    mock.control.zeroRows = true;
    expect(await saveExperience('user-1', create)).toMatchObject({ error: { code: 'CONFLICT' } });
  });

  it('new/new interleaving loses no data; losing command can retry with the same id', async () => {
    const mock = setup();
    const second = { operation: 'create', experience: { ...experience, id: 'exp-2' } };
    mock.control.beforeUpdate = async () => {
      expect(await saveExperience('user-1', second)).toMatchObject({ ok: true });
    };
    expect(await saveExperience('user-1', create)).toMatchObject({ error: { code: 'CONFLICT' } });
    expect(await saveExperience('user-1', create)).toMatchObject({ ok: true });
    expect(mock.rows.user_military_profiles[0].raw_profile_jsonb).toEqual({
      careerHistory: { experiences: [second.experience, experience] },
    });
  });

  it('recomposes safely after the partial unique index insert race', async () => {
    const mock = setup();
    mock.rows.user_military_profiles = [];
    mock.control.beforeInsert = async () => {
      expect(
        await saveExperience('user-1', {
          operation: 'create',
          experience: { ...experience, id: 'exp-2' },
        }),
      ).toMatchObject({ ok: true });
    };
    expect(await saveExperience('user-1', create)).toMatchObject({ ok: true });
    expect(mock.rows.user_military_profiles).toHaveLength(1);
    expect(
      (
        mock.rows.user_military_profiles[0].raw_profile_jsonb as {
          careerHistory: { experiences: unknown[] };
        }
      ).careerHistory.experiences,
    ).toHaveLength(2);
  });

  it.each(['save', 'projection'])(
    'rejects stale %s after a new experience; projection never writes civil',
    async (writer) => {
      const mock = setup();
      mock.control.beforeUpdate = async () => {
        expect(await saveExperience('user-1', create)).toMatchObject({ ok: true });
      };
      await expect(
        writer === 'save'
          ? saveProfile({
              ...draft,
              careerHistory: { experiences: [] },
              expectedCareerHistory: null,
            } as never)
          : projectWizardToProfiles('user-1'),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(
        mock.calls.filter(
          (call) => call.table === 'user_civil_profiles' && call.operation !== 'select',
        ),
      ).toEqual([]);
      expect(mock.rows.user_military_profiles[0].raw_profile_jsonb).toEqual({
        careerHistory: { experiences: [experience] },
      });
    },
  );

  it.each(['save', 'projection'])(
    'rejects a new stale snapshot after %s changes metadata',
    async (writer) => {
      const mock = setup();
      mock.control.beforeUpdate = async () => {
        if (writer === 'save')
          await saveProfile({
            ...draft,
            careerHistory: { experiences: [] },
            expectedCareerHistory: null,
          } as never);
        else await projectWizardToProfiles('user-1');
      };
      expect(await saveExperience('user-1', create)).toMatchObject({ error: { code: 'CONFLICT' } });
    },
  );

  it('requires explicit aggregate baseline even on initial history; absent is not empty', async () => {
    const mock = setup();
    await expect(
      saveProfile({ ...draft, careerHistory: { experiences: [] } } as never),
    ).rejects.toThrow();
    expect(mock.calls.filter((call) => call.operation !== 'select')).toEqual([]);
    await saveProfile({
      ...draft,
      careerHistory: { experiences: [] },
      expectedCareerHistory: null,
    } as never);
    await expect(
      saveProfile({
        ...draft,
        careerHistory: { experiences: [experience] },
        expectedCareerHistory: null,
      } as never),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('edits one experience without changing siblings, stages or omitted visible fields', async () => {
    const second = { id: 'exp-2', activity: 'op_maintenance', frequency: 'by_periods' };
    const mock = setup({
      careerHistory: { ...history, experiences: [full, second] },
      keep: [1, 2],
    });
    expect(
      await saveExperience('user-1', {
        operation: 'edit',
        id: full.id,
        expectedExperience: full,
        set: { activity: 'reporting' },
        clear: [],
      }),
    ).toMatchObject({ ok: true });
    expect(mock.rows.user_military_profiles[0].raw_profile_jsonb).toEqual({
      keep: [1, 2],
      careerHistory: { ...history, experiences: [{ ...full, activity: 'reporting' }, second] },
    });
  });

  it('does not create a profile for an edit with no current profile', async () => {
    const mock = setup();
    mock.rows.user_military_profiles = [];
    expect(
      await saveExperience('user-1', {
        operation: 'edit',
        id: experience.id,
        expectedExperience: experience,
        set: {},
      }),
    ).toMatchObject({ error: { code: 'NOT_FOUND' } });
    expect(mock.calls.every((call) => call.operation === 'select')).toBe(true);
  });

  it('repeated create ignores hidden enrichment but not changes to declared fields', async () => {
    const mock = setup({ careerHistory: history });
    const declared = { ...experience, autonomy: 'supervised' };
    expect(
      await saveExperience('user-1', { operation: 'create', experience: declared }),
    ).toMatchObject({ ok: true });
    expect(mock.calls.every((call) => call.operation === 'select')).toBe(true);
  });

  it.each(['save', 'projection'])(
    'uses exact unnormalized raw in %s guard and preserves hidden narratives',
    async (writer) => {
      const raw = { careerHistory: history, metadata: { exact: '  unchanged  ' } };
      const mock = setup(raw);
      if (writer === 'save') await saveProfile(draft as never);
      else await projectWizardToProfiles('user-1');
      expect(mock.calls.find((call) => call.operation === 'update')?.filters.rawGuard).toEqual(raw);
      expect(mock.rows.user_military_profiles[0].raw_profile_jsonb).toMatchObject(raw);
    },
  );

  it('revalidates full replacement baseline after a unique insert race instead of overwriting the winner', async () => {
    const mock = setup();
    mock.rows.user_military_profiles = [];
    mock.control.beforeInsert = async () => {
      expect(await saveExperience('user-1', create)).toMatchObject({ ok: true });
    };
    await expect(
      saveProfile({
        ...draft,
        careerHistory: { experiences: [] },
        expectedCareerHistory: null,
      } as never),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(mock.rows.user_military_profiles[0].raw_profile_jsonb).toEqual({
      careerHistory: { experiences: [experience] },
    });
    expect(
      mock.calls.filter(
        (call) => call.table === 'user_civil_profiles' && call.operation !== 'select',
      ),
    ).toEqual([]);
  });

  it.each(['save', 'projection'])(
    'zero returned rows rejects %s and prevents civil writes',
    async (writer) => {
      const mock = setup();
      mock.control.zeroRows = true;
      await expect(
        writer === 'save' ? saveProfile(draft as never) : projectWizardToProfiles('user-1'),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(
        mock.calls.filter(
          (call) => call.table === 'user_civil_profiles' && call.operation !== 'select',
        ),
      ).toEqual([]);
    },
  );

  it('a repeated insert collision ends as conflict, not an unbounded loop', async () => {
    const mock = setup();
    mock.rows.user_military_profiles = [];
    mock.control.error = { table: 'user_military_profiles', operation: 'insert', code: '23505' };
    expect(await saveExperience('user-1', create)).toMatchObject({ error: { code: 'CONFLICT' } });
    expect(mock.calls.filter((call) => call.operation === 'insert')).toHaveLength(2);
  });
});
