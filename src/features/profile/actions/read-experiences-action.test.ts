import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { profileClientFixture } from '../server/profile-client.test-helper';
import { createExperienceAction } from './save-experience-action';
import { readExperiencesAction } from './read-experiences-action';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock(
  '@/features/auth/server/get-current-user',
  () => import('../../auth/server/get-current-user'),
);
vi.mock('@/lib/contracts/domain-result', () => import('../../../lib/contracts/domain-result'));

let storage: ReturnType<typeof profileClientFixture>;
const getUser = vi.fn();
const experiences = [
  { id: 'experience-one', activity: 'analysis', context: 'Contexto', stageIds: ['stage-one'] },
];

beforeEach(() => {
  vi.resetAllMocks();
  storage = profileClientFixture({
    careerHistory: { stages: [{ id: 'stage-one', focus: 'technical' }], experiences },
  });
  storage.rows.user_wizard_state = [];
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  vi.mocked(createClient).mockResolvedValue({
    ...storage.client,
    auth: { getUser },
  } as never);
});

describe('readExperiencesAction con auth y lector canonicos reales', () => {
  it('lee solo el historial militar usando la identidad autenticada sin perfil base', async () => {
    expect(await readExperiencesAction()).toEqual({ ok: true, data: { experiences } });
    expect(getUser).toHaveBeenCalledOnce();
    expect(storage.calls).toEqual([
      {
        table: 'user_military_profiles',
        operation: 'select',
        filters: { user_id: 'user-1', is_current: true },
        payload: undefined,
      },
    ]);
    expect(storage.rows.app_user_profiles).toEqual([]);
  });

  it.each(['missing_profile', 'missing_history', 'empty_history'])(
    '%s es vacio valido sin escrituras',
    async (state) => {
      if (state === 'missing_profile') storage.rows.user_military_profiles = [];
      else
        storage.rows.user_military_profiles[0].raw_profile_jsonb =
          state === 'missing_history' ? {} : { careerHistory: { experiences: [] } };
      expect(await readExperiencesAction()).toEqual({ ok: true, data: { experiences: [] } });
      expect(
        storage.calls.every(
          (call) => call.table === 'user_military_profiles' && call.operation === 'select',
        ),
      ).toBe(true);
    },
  );

  it('no lee sin sesion verificada por auth.getUser', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
    expect(await readExperiencesAction()).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' },
    });
    expect(storage.calls).toEqual([]);
  });

  it('falla la verificacion de sesion sin consultar persistencia', async () => {
    getUser.mockRejectedValue(new Error('private cookie provider'));
    const result = await readExperiencesAction();
    expect(result).toMatchObject({ ok: false, error: { code: 'EXTERNAL_DEPENDENCY_ERROR' } });
    expect(JSON.stringify(result)).not.toContain('private cookie provider');
    expect(storage.calls).toEqual([]);
  });

  it('no convierte datos corruptos en vacio ni escribe', async () => {
    storage.rows.user_military_profiles[0].raw_profile_jsonb = { careerHistory: null };
    expect(await readExperiencesAction()).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR', retryable: false },
    });
    expect(storage.calls.every((call) => call.operation === 'select')).toBe(true);
  });

  it.each([
    ['XX000', 'EXTERNAL_DEPENDENCY_ERROR'],
    ['PGRST116', 'INTERNAL_ERROR'],
  ])('preserva el error %s del lector sin devolver vacio', async (code, expected) => {
    storage.control.error = { table: 'user_military_profiles', operation: 'select', code };
    const result = await readExperiencesAction();
    expect(result).toMatchObject({ ok: false, error: { code: expected } });
    expect(JSON.stringify(result)).not.toContain('private provider details');
  });

  it('cuenta sin base ni militar guarda y relee con las actions reales sin bootstrap', async () => {
    storage.rows.user_military_profiles = [];
    const experience = { id: 'new-experience', activity: 'analysis' };
    expect(await readExperiencesAction()).toEqual({ ok: true, data: { experiences: [] } });
    expect(await createExperienceAction({ experience })).toEqual({
      ok: true,
      data: { experience },
    });
    expect(await readExperiencesAction()).toEqual({
      ok: true,
      data: { experiences: [experience] },
    });
    expect(storage.calls.map((call) => [call.table, call.operation])).toEqual([
      ['user_military_profiles', 'select'],
      ['user_military_profiles', 'select'],
      ['user_military_profiles', 'insert'],
      ['user_military_profiles', 'select'],
    ]);
    expect(storage.calls.find((call) => call.operation === 'insert')?.payload).toEqual({
      user_id: 'user-1',
      is_current: true,
      raw_profile_jsonb: { careerHistory: { experiences: [experience] } },
    });
    expect(storage.rows.app_user_profiles).toEqual([]);
    expect(storage.rows.user_civil_profiles).toEqual([]);
    expect(storage.rows.user_wizard_state).toEqual([]);
  });
});
