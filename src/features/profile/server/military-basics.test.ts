import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/features/auth/server/get-current-user';
import { saveMilitaryBasicsAction } from '../actions/save-military-basics-action';
import { saveMilitaryBasicsSchema } from '../schemas/military-basics.schema';
import { updateMilitarySnapshot } from './update-military-snapshot';
import { readMilitaryBasics, saveMilitaryBasics } from './military-basics';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/features/auth/server/get-current-user', () => ({ getCurrentUser: vi.fn() }));

const blank = { branch: null, rank_text: null, specialty_text: null, service_years: null };
type Row = Record<string, unknown>;
let rows: Row[];
let calls: Array<{
  table: string;
  operation: string;
  columns?: string;
  filters: Row;
  payload?: Row;
}>;
let beforeWrite: (() => void) | undefined;
let storageError: string | undefined;
let zeroRows: boolean;

beforeEach(() => {
  vi.clearAllMocks();
  rows = [];
  calls = [];
  beforeWrite = undefined;
  storageError = undefined;
  zeroRows = false;
  vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never);
  vi.mocked(createClient).mockResolvedValue({
    from(table: string) {
      const build = (operation: string, payload?: Row) => {
        const filters: Row = {};
        let columns: string | undefined;
        let rawGuard: string | undefined;
        const execute = async () => {
          calls.push({ table, operation, columns, filters: { ...filters }, payload });
          if (storageError)
            return { data: null, error: { code: storageError, message: 'private details' } };
          if (operation !== 'read') {
            beforeWrite?.();
            beforeWrite = undefined;
          }
          const matching = rows.filter(
            (row) =>
              Object.entries(filters).every(([key, value]) => row[key] === value) &&
              (rawGuard === undefined || JSON.stringify(row.raw_profile_jsonb) === rawGuard),
          );
          let selected = matching;
          if (operation === 'insert') {
            if (rows.some((row) => row.user_id === payload?.user_id && row.is_current))
              return { data: null, error: { code: '23505' } };
            selected = [{ ...blank, id: 'new-1', raw_profile_jsonb: {}, ...payload }];
            rows.push(...selected);
          }
          if (operation === 'update') {
            if (zeroRows) selected = [];
            selected.forEach((row) => Object.assign(row, payload));
          }
          return {
            data: selected.map((row) =>
              Object.fromEntries(
                (columns ?? '').split(',').map((key) => [key.trim(), row[key.trim()]]),
              ),
            ),
            error: null,
          };
        };
        const query = {
          eq(key: string, value: unknown) {
            filters[key] = value;
            return query;
          },
          is(key: string, value: null) {
            filters[key] = value;
            return query;
          },
          filter(key: string, operator: string, value: string) {
            expect([key, operator]).toEqual(['raw_profile_jsonb', 'eq']);
            rawGuard = value;
            return query;
          },
          select(value: string) {
            columns = value;
            return query;
          },
          async maybeSingle() {
            const result = await execute();
            return {
              ...result,
              data: result.data?.length === 1 ? result.data[0] : null,
              error: result.data && result.data.length > 1 ? { code: 'PGRST116' } : result.error,
            };
          },
          then(
            resolve: (value: Awaited<ReturnType<typeof execute>>) => unknown,
            reject?: (error: unknown) => unknown,
          ) {
            return execute().then(resolve, reject);
          },
        };
        return query;
      };
      return {
        select: (columns: string) => build('read').select(columns),
        insert: (payload: Row) => build('insert', payload),
        update: (payload: Row) => build('update', payload),
      };
    },
  } as never);
});

function existing(overrides: Row = {}) {
  const row: Row & { id: string; raw_profile_jsonb: Record<string, unknown> } = {
    id: 'mil-1',
    user_id: 'user-1',
    is_current: true,
    ...blank,
    raw_profile_jsonb: { careerHistory: { experiences: [] }, metadata: { keep: true } },
    ...overrides,
  };
  rows.push(row);
  return row;
}

describe('military basics boundary', () => {
  it.each([
    ['army', 'soldier', 'Soldado'],
    ['navy', 'sailor', 'Marinero'],
    ['air_force', 'soldier', 'Soldado'],
    ['navy', 'p_corporal', 'Cabo 1º'],
  ])('saves local branch %s with compatible rank %s', async (branch, code, label) => {
    expect(
      await saveMilitaryBasics('user-1', {
        expected: null,
        set: { branch, rank: { code, label } },
      }),
    ).toMatchObject({ ok: true, data: { branch, rank_text: label } });
  });
  it.each([
    ['navy', 'soldier', 'Soldado'],
    ['army', 'sailor', 'Marinero'],
    ['air_force', 'sailor', 'Marinero'],
    [null, 'soldier', 'Soldado'],
    ['army', 'lieutenant', 'Teniente'],
    ['army', 'p_corporal', 'Cabo Primero'],
    ['navy', 'sailor', 'Inventado'],
  ])('rejects new incompatible or forged pair %s / %s / %s', async (branch, code, label) => {
    expect(
      await saveMilitaryBasics('user-1', {
        expected: null,
        set: { branch, rank: { code, label } },
      }),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(calls).toEqual([]);
  });
  it('validates the effective rank on a branch-only patch, not just submitted fields', async () => {
    const row = existing({ branch: 'army', rank_text: 'Soldado' });
    const read = await readMilitaryBasics('user-1');
    if (!read.ok) throw new Error('read');
    expect(
      await saveMilitaryBasics('user-1', { expected: read.data, set: { branch: 'navy' } }),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(calls).toHaveLength(1);
    expect(row.branch).toBe('army');
    expect(
      await saveMilitaryBasics('user-1', { expected: read.data, set: { branch: 'air_force' } }),
    ).toMatchObject({ ok: true, data: { branch: 'air_force', rank_text: 'Soldado' } });
    expect(calls[1].payload).toEqual({ branch: 'air_force' });
    expect(calls[1].filters.rank_text).toBe('Soldado');
  });
  it('rejects a forged baseline via the unchanged column CAS', async () => {
    const row = existing({ branch: 'army', rank_text: 'Soldado' });
    const read = await readMilitaryBasics('user-1');
    if (!read.ok || !read.data) throw new Error('read');
    expect(
      await saveMilitaryBasics('user-1', {
        expected: { ...read.data, rank_text: 'Marinero' },
        set: { branch: 'navy' },
      }),
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(row).toMatchObject({ branch: 'army', rank_text: 'Soldado' });
  });
  it('validates rank-only patches against the stored branch and allows explicit nullable clears', async () => {
    existing({ branch: 'navy', rank_text: 'Marinero' });
    const read = await readMilitaryBasics('user-1');
    if (!read.ok) throw new Error('read');
    for (const set of [{ rank: { code: 'soldier', label: 'Soldado' } }, { branch: null }]) {
      expect(await saveMilitaryBasics('user-1', { expected: read.data, set })).toMatchObject({
        ok: false,
        error: { code: 'VALIDATION_ERROR' },
      });
    }
    expect(calls).toHaveLength(1);
    expect(
      await saveMilitaryBasics('user-1', {
        expected: read.data,
        set: { branch: null, rank: { code: null, label: null } },
      }),
    ).toMatchObject({ ok: true, data: { branch: null, rank_text: null } });
  });
  it('keeps the original Cabo 1º column baseline on a compatible branch-only change', async () => {
    existing({ branch: 'army', rank_text: 'Cabo 1º' });
    const read = await readMilitaryBasics('user-1');
    if (!read.ok) throw new Error('read');
    expect(
      await saveMilitaryBasics('user-1', { expected: read.data, set: { branch: 'navy' } }),
    ).toMatchObject({ ok: true, data: { branch: 'navy', rank_text: 'Cabo 1º' } });
    expect(calls[1].payload).toEqual({ branch: 'navy' });
    expect(calls[1].filters.rank_text).toBe('Cabo 1º');
  });
  it('does not silently discard a legacy officer rank when changing branch', async () => {
    existing({ branch: 'army', rank_text: 'Teniente' });
    const read = await readMilitaryBasics('user-1');
    if (!read.ok) throw new Error('read');
    expect(
      await saveMilitaryBasics('user-1', { expected: read.data, set: { branch: 'navy' } }),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(calls).toHaveLength(1);
    expect(
      await saveMilitaryBasics('user-1', {
        expected: read.data,
        set: { branch: 'navy', rank: { code: null, label: null } },
      }),
    ).toMatchObject({ ok: true, data: { branch: 'navy', rank_text: null } });
  });
  it.each(['common_corps', 'other', 'unknown', 'army', 'navy'])(
    'preserves legacy branch/rank %s on unrelated edits',
    async (branch) => {
      existing({ branch, rank_text: 'Teniente' });
      const read = await readMilitaryBasics('user-1');
      if (!read.ok) throw new Error('read');
      expect(
        await saveMilitaryBasics('user-1', { expected: read.data, set: { serviceYears: 2 } }),
      ).toMatchObject({ ok: true, data: { branch, rank_text: 'Teniente' } });
      expect(calls[1].payload).toEqual({ service_years: 2 });
    },
  );
  it('preserves a previously incompatible combination unless branch or rank is edited', async () => {
    existing({ branch: 'army', rank_text: 'Marinero' });
    const read = await readMilitaryBasics('user-1');
    if (!read.ok) throw new Error('read');
    expect(
      await saveMilitaryBasics('user-1', { expected: read.data, set: { serviceYears: 2 } }),
    ).toMatchObject({ ok: true, data: { branch: 'army', rank_text: 'Marinero' } });
  });
  it.each([null, 0, 60])('accepts nullable years %s using the existing contract', (years) => {
    expect(
      saveMilitaryBasicsSchema.safeParse({ expected: null, set: { serviceYears: years } }).success,
    ).toBe(true);
  });
  it.each([-1, 61, 1.5, '3'])('rejects invalid years %s', (years) => {
    expect(
      saveMilitaryBasicsSchema.safeParse({ expected: null, set: { serviceYears: years } }).success,
    ).toBe(false);
  });
  it.each([
    { branch: 'Army' },
    { rank: { code: 'soldier', label: 'Cabo' } },
    { specialty: { code: 'invented', label: 'Inventada' } },
    { userId: 'other' },
  ])('rejects unsupported fields or catalog values %j', async (set) => {
    expect((await saveMilitaryBasics('user-1', { expected: null, set })).ok).toBe(false);
    expect(calls).toEqual([]);
  });
  it('rejects client identity at the command boundary', async () => {
    expect(
      (await saveMilitaryBasicsAction({ userId: 'other', expected: null, set: { branch: 'army' } }))
        .ok,
    ).toBe(false);
    expect(calls).toEqual([]);
  });
});

describe('military basics storage', () => {
  it('reads absence without bootstrap or writes', async () => {
    expect(await readMilitaryBasics('user-1')).toEqual({ ok: true, data: null });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      table: 'user_military_profiles',
      operation: 'read',
      filters: { user_id: 'user-1', is_current: true },
    });
    expect(calls[0].columns).not.toMatch(/raw|source|component|latest/);
  });
  it('inserts minimal columns and reads back confirmed labels without a base profile', async () => {
    const result = await saveMilitaryBasicsAction({
      expected: null,
      set: {
        branch: 'army',
        rank: { code: 'soldier', label: 'Soldado' },
        specialty: { code: 'maintenance', label: 'Mantenimiento' },
        serviceYears: 0,
      },
    });
    expect(result).toEqual({
      ok: true,
      data: {
        id: 'new-1',
        branch: 'army',
        rank_text: 'Soldado',
        specialty_text: 'Mantenimiento',
        service_years: 0,
      },
    });
    expect(calls[0].payload).toEqual({
      user_id: 'user-1',
      is_current: true,
      branch: 'army',
      rank_text: 'Soldado',
      specialty_text: 'Mantenimiento',
      service_years: 0,
    });
    expect(await readMilitaryBasics('user-1')).toEqual(result);
    expect(calls.every((call) => call.table === 'user_military_profiles')).toBe(true);
  });
  it('preserves unknown catalog strings and even corrupt history without reading or rewriting JSON', async () => {
    const row = existing({
      branch: 'legacy-army',
      rank_text: 'Empleo antiguo',
      specialty_text: 'Especialidad antigua',
      raw_profile_jsonb: { careerHistory: null, metadata: 'keep' },
      component: 'infantry',
    });
    const before = structuredClone(row);
    const read = await readMilitaryBasics('user-1');
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(
      (await saveMilitaryBasics('user-1', { expected: read.data, set: { serviceYears: 60 } })).ok,
    ).toBe(true);
    expect(row).toEqual({ ...before, service_years: 60 });
    expect(calls[1].filters).toEqual({
      id: 'mil-1',
      user_id: 'user-1',
      is_current: true,
      ...blank,
      branch: 'legacy-army',
      rank_text: 'Empleo antiguo',
      specialty_text: 'Especialidad antigua',
    });
    expect(calls[1].payload).toEqual({ service_years: 60 });
  });
  it.each([
    'branch',
    'rank_text',
    'specialty_text',
    'service_years',
    'id',
    'user_id',
    'is_current',
  ])('conflicts when baseline %s changes', async (field) => {
    const row = existing();
    const read = await readMilitaryBasics('user-1');
    if (!read.ok) throw new Error('read');
    beforeWrite = () => {
      row[field] = field === 'service_years' ? 2 : field === 'is_current' ? false : 'changed';
    };
    const result = await saveMilitaryBasics('user-1', {
      expected: read.data,
      set: { branch: 'army' },
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(row.branch).toBe(field === 'branch' ? 'changed' : null);
  });
  it('reports a zero-row update as conflict', async () => {
    existing();
    const read = await readMilitaryBasics('user-1');
    if (!read.ok) throw new Error('read');
    zeroRows = true;
    expect(
      await saveMilitaryBasics('user-1', { expected: read.data, set: { branch: 'army' } }),
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
  });
  it.each(['before', 'after'])(
    'preserves concurrent history %s a column save, with the real snapshot helper',
    async (order) => {
      const row = existing();
      const read = await readMilitaryBasics('user-1');
      if (!read.ok) throw new Error('read');
      const snapshot = structuredClone({ id: row.id, raw_profile_jsonb: row.raw_profile_jsonb });
      const raw = {
        ...row.raw_profile_jsonb,
        careerHistory: { experiences: [{ id: 'exp-1', activity: 'analysis' }] },
      };
      const writeHistory = async () =>
        updateMilitarySnapshot(await createClient(), 'user-1', snapshot, {
          raw_profile_jsonb: raw,
        });
      if (order === 'before') await writeHistory();
      expect(
        (await saveMilitaryBasics('user-1', { expected: read.data, set: { branch: 'army' } })).ok,
      ).toBe(true);
      if (order === 'after') await writeHistory();
      expect(row.raw_profile_jsonb).toEqual(raw);
      expect(row.branch).toBe('army');
    },
  );
  it('does not overwrite a concurrent insert from experiences', async () => {
    beforeWrite = () => {
      existing();
    };
    expect(
      await saveMilitaryBasics('user-1', { expected: null, set: { branch: 'army' } }),
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(rows[0].branch).toBeNull();
    expect(calls).toHaveLength(1);
  });
  it('clears explicitly without confusing zero with null', async () => {
    existing({ service_years: 0, rank_text: 'Soldado' });
    const read = await readMilitaryBasics('user-1');
    if (!read.ok) throw new Error('read');
    expect(
      await saveMilitaryBasics('user-1', {
        expected: read.data,
        set: { serviceYears: null, rank: { code: null, label: null } },
      }),
    ).toMatchObject({ ok: true, data: { service_years: null, rank_text: null } });
  });
  it('hides provider errors for reads and writes', async () => {
    storageError = 'XX000';
    expect(JSON.stringify(await readMilitaryBasics('user-1'))).not.toContain('private');
    expect(
      await saveMilitaryBasics('user-1', { expected: null, set: { branch: 'army' } }),
    ).toMatchObject({ ok: false, error: { code: 'EXTERNAL_DEPENDENCY_ERROR' } });
  });
  it('does not write without authentication', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    expect(
      await saveMilitaryBasicsAction({ expected: null, set: { branch: 'army' } }),
    ).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
    expect(calls).toEqual([]);
  });
});
