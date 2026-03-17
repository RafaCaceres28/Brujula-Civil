import type {
  AppUserProfileRow,
  UserCivilProfileRow,
  UserMilitaryProfileRow,
} from '@/types/database.types';
import { createClient } from '@/lib/supabase/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveProfile } from './save-profile';
import { updateProfile } from './update-profile';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

type TableName = 'app_user_profiles' | 'user_military_profiles' | 'user_civil_profiles';
type OperationName = 'select' | 'upsert' | 'update' | 'insert';
type OperationKey = `${TableName}.${OperationName}`;

type MockError = {
  message: string;
  code?: string;
};

type MockState = {
  appRows: AppUserProfileRow[];
  militaryRows: UserMilitaryProfileRow[];
  civilRows: UserCivilProfileRow[];
};

type MockScenario = {
  state?: Partial<MockState>;
  errors?: Partial<Record<OperationKey, MockError>>;
  errorsOnce?: Partial<Record<OperationKey, MockError>>;
  raceConflicts?: {
    militaryInsertOnce?: boolean;
    civilInsertOnce?: boolean;
  };
};

type QueryState = {
  filters: Record<string, unknown>;
  orders: Array<{ column: string; ascending: boolean }>;
  limitValue: number | null;
};

function compareValues(left: unknown, right: unknown, ascending: boolean): number {
  if (left === right) {
    return 0;
  }

  if (left == null) {
    return ascending ? -1 : 1;
  }

  if (right == null) {
    return ascending ? 1 : -1;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return ascending ? left - right : right - left;
  }

  const normalizedLeft = String(left);
  const normalizedRight = String(right);

  return ascending
    ? normalizedLeft.localeCompare(normalizedRight)
    : normalizedRight.localeCompare(normalizedLeft);
}

function sortRows<T extends Record<string, unknown>>(rows: T[], orders: QueryState['orders']): T[] {
  if (orders.length === 0) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    for (const order of orders) {
      const comparison = compareValues(left[order.column], right[order.column], order.ascending);
      if (comparison !== 0) {
        return comparison;
      }
    }

    return 0;
  });
}

function createMockError(error: MockError | null) {
  if (!error) {
    return null;
  }

  return {
    message: error.message,
    code: error.code,
  };
}

function buildAppRow(overrides: Partial<AppUserProfileRow>): AppUserProfileRow {
  return {
    user_id: overrides.user_id ?? 'user-1',
    email: overrides.email ?? 'ada@example.com',
    display_name: overrides.display_name ?? 'Ada Lovelace',
    locale: overrides.locale ?? 'es-ES',
    timezone: overrides.timezone ?? 'Europe/Madrid',
    onboarding_completed: overrides.onboarding_completed ?? false,
    marketing_opt_in: overrides.marketing_opt_in ?? false,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
  };
}

function buildMilitaryRow(overrides: Partial<UserMilitaryProfileRow>): UserMilitaryProfileRow {
  return {
    id: overrides.id ?? 'mil-1',
    user_id: overrides.user_id ?? 'user-1',
    is_current: overrides.is_current ?? true,
    branch: overrides.branch ?? null,
    component: overrides.component ?? 'Signals',
    rank_text: overrides.rank_text ?? 'Captain',
    specialty_text: overrides.specialty_text ?? null,
    service_years: overrides.service_years ?? 7,
    latest_unit: overrides.latest_unit ?? null,
    latest_role_title: overrides.latest_role_title ?? 'Captain',
    source_text: overrides.source_text ?? 'Led teams',
    raw_profile_jsonb: overrides.raw_profile_jsonb ?? {},
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
  };
}

function buildCivilRow(overrides: Partial<UserCivilProfileRow>): UserCivilProfileRow {
  return {
    id: overrides.id ?? 'civ-1',
    user_id: overrides.user_id ?? 'user-1',
    military_profile_id: overrides.military_profile_id ?? 'mil-1',
    version_no: overrides.version_no ?? 1,
    is_current: overrides.is_current ?? true,
    status: overrides.status ?? 'draft',
    target_role: overrides.target_role ?? 'Operations Manager',
    target_sector: overrides.target_sector ?? 'Logistics',
    headline: overrides.headline ?? null,
    summary: overrides.summary ?? null,
    structured_profile_jsonb: overrides.structured_profile_jsonb ?? {
      target: {
        preferredLocations: ['Remote'],
      },
    },
    generator_name: overrides.generator_name ?? null,
    generator_version: overrides.generator_version ?? null,
    prompt_version: overrides.prompt_version ?? null,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
  };
}

function createSupabaseMock(scenario: MockScenario = {}) {
  const state: MockState = {
    appRows: scenario.state?.appRows ? [...scenario.state.appRows] : [],
    militaryRows: scenario.state?.militaryRows ? [...scenario.state.militaryRows] : [],
    civilRows: scenario.state?.civilRows ? [...scenario.state.civilRows] : [],
  };

  const raceConflictState = {
    militaryInsertUsed: false,
    civilInsertUsed: false,
  };

  const oneTimeErrorState: Partial<Record<OperationKey, boolean>> = {};

  let militaryIdCounter = 100;
  let civilIdCounter = 100;

  function getRows(table: TableName): Record<string, unknown>[] {
    switch (table) {
      case 'app_user_profiles':
        return state.appRows;
      case 'user_military_profiles':
        return state.militaryRows;
      case 'user_civil_profiles':
        return state.civilRows;
    }
  }

  function getOperationError(table: TableName, operation: OperationName) {
    const key = `${table}.${operation}` as OperationKey;

    if (!oneTimeErrorState[key] && scenario.errorsOnce?.[key]) {
      oneTimeErrorState[key] = true;
      return createMockError(scenario.errorsOnce[key] ?? null);
    }

    return createMockError(scenario.errors?.[key] ?? null);
  }

  function runSelect(table: TableName, queryState: QueryState) {
    const error = getOperationError(table, 'select');
    if (error) {
      return { data: [] as Record<string, unknown>[], error };
    }

    let rows = getRows(table).filter((row) => {
      return Object.entries(queryState.filters).every(([column, value]) => row[column] === value);
    });

    rows = sortRows(rows, queryState.orders);

    if (queryState.limitValue != null) {
      rows = rows.slice(0, queryState.limitValue);
    }

    return {
      data: rows,
      error: null,
    };
  }

  const client = {
    from(table: TableName) {
      return {
        select() {
          const queryState: QueryState = {
            filters: {},
            orders: [],
            limitValue: null,
          };

          const queryBuilder = {
            eq(column: string, value: unknown) {
              queryState.filters[column] = value;
              return queryBuilder;
            },
            order(column: string, options?: { ascending?: boolean }) {
              queryState.orders.push({ column, ascending: options?.ascending ?? true });
              return queryBuilder;
            },
            async limit(value: number) {
              queryState.limitValue = value;
              return runSelect(table, queryState);
            },
          };

          return queryBuilder;
        },
        async upsert(payload: Record<string, unknown>) {
          const error = getOperationError(table, 'upsert');
          if (error) {
            return { error };
          }

          if (table !== 'app_user_profiles') {
            return { error: null };
          }

          const userId = String(payload.user_id);
          const index = state.appRows.findIndex((row) => row.user_id === userId);

          if (index >= 0) {
            state.appRows[index] = {
              ...state.appRows[index],
              ...payload,
              updated_at: '2026-01-02T00:00:00.000Z',
            } as AppUserProfileRow;
          } else {
            state.appRows.push(
              buildAppRow({
                ...payload,
                user_id: userId,
              } as Partial<AppUserProfileRow>),
            );
          }

          return { error: null };
        },
        update(payload: Record<string, unknown>) {
          const filterState: Record<string, unknown> = {};

          const updateBuilder = {
            async eq(column: string, value: unknown) {
              filterState[column] = value;

              const error = getOperationError(table, 'update');
              if (error) {
                return { error };
              }

              if (table === 'user_military_profiles') {
                const row = state.militaryRows.find((candidate) => candidate.id === filterState.id);
                if (row) {
                  Object.assign(row, payload, { updated_at: '2026-01-02T00:00:00.000Z' });
                }
              }

              if (table === 'user_civil_profiles') {
                const row = state.civilRows.find((candidate) => candidate.id === filterState.id);
                if (row) {
                  Object.assign(row, payload, { updated_at: '2026-01-02T00:00:00.000Z' });
                }
              }

              return { error: null };
            },
          };

          return updateBuilder;
        },
        insert(payload: Record<string, unknown>) {
          return {
            select() {
              return {
                async single() {
                  const error = getOperationError(table, 'insert');
                  if (error) {
                    return { data: null, error };
                  }

                  if (
                    table === 'user_military_profiles' &&
                    scenario.raceConflicts?.militaryInsertOnce &&
                    !raceConflictState.militaryInsertUsed
                  ) {
                    raceConflictState.militaryInsertUsed = true;
                    state.militaryRows.push(
                      buildMilitaryRow({
                        id: 'mil-race',
                        user_id: String(payload.user_id),
                        is_current: true,
                      }),
                    );

                    return {
                      data: null,
                      error: {
                        code: '23505',
                        message: 'duplicate key value violates unique constraint',
                      },
                    };
                  }

                  if (
                    table === 'user_civil_profiles' &&
                    scenario.raceConflicts?.civilInsertOnce &&
                    !raceConflictState.civilInsertUsed
                  ) {
                    raceConflictState.civilInsertUsed = true;
                    state.civilRows.push(
                      buildCivilRow({
                        id: 'civ-race',
                        user_id: String(payload.user_id),
                        military_profile_id: String(payload.military_profile_id),
                        version_no: Number(payload.version_no),
                        is_current: true,
                      }),
                    );

                    return {
                      data: null,
                      error: {
                        code: '23505',
                        message: 'duplicate key value violates unique constraint',
                      },
                    };
                  }

                  if (table === 'user_military_profiles') {
                    militaryIdCounter += 1;
                    const row = buildMilitaryRow({
                      id: `mil-${militaryIdCounter}`,
                      ...payload,
                    } as Partial<UserMilitaryProfileRow>);
                    state.militaryRows.push(row);
                    return { data: { id: row.id }, error: null };
                  }

                  if (table === 'user_civil_profiles') {
                    civilIdCounter += 1;
                    const row = buildCivilRow({
                      id: `civ-${civilIdCounter}`,
                      ...payload,
                    } as Partial<UserCivilProfileRow>);
                    state.civilRows.push(row);
                    return { data: { id: row.id }, error: null };
                  }

                  return { data: null, error: null };
                },
              };
            },
          };
        },
      };
    },
  };

  return {
    client,
    state,
  };
}

const validDraftInput = {
  userId: 'user-1',
  profile: {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+34123456789',
    city: 'Madrid',
  },
  militaryBackground: {
    rank: 'Captain',
    area: 'Signals',
    yearsOfService: 7,
    summary: 'Led teams',
  },
  civilianTarget: {
    targetRole: 'Operations Manager',
    targetSector: 'Logistics',
    locationPreference: 'Remote',
  },
};

describe('saveProfile draft contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates base, military and civil profiles on first save', async () => {
    const mock = createSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await saveProfile(validDraftInput);

    expect(result).toEqual({
      status: 'draft',
      militaryProfileId: 'mil-101',
      civilProfileId: 'civ-101',
      operationMode: 'created',
    });
    expect(mock.state.appRows).toHaveLength(1);
    expect(mock.state.militaryRows).toHaveLength(1);
    expect(mock.state.civilRows).toHaveLength(1);
    expect(mock.state.civilRows[0]).toMatchObject({
      user_id: 'user-1',
      military_profile_id: 'mil-101',
      is_current: true,
      version_no: 1,
      status: 'draft',
    });
  });

  it('is idempotent and updates current rows without duplicates', async () => {
    const mock = createSupabaseMock({
      state: {
        appRows: [buildAppRow({ user_id: 'user-1' })],
        militaryRows: [
          buildMilitaryRow({ id: 'mil-existing', user_id: 'user-1', is_current: true }),
        ],
        civilRows: [
          buildCivilRow({
            id: 'civ-existing',
            user_id: 'user-1',
            military_profile_id: 'mil-existing',
            is_current: true,
            version_no: 3,
          }),
        ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const firstResult = await saveProfile(validDraftInput);
    const secondResult = await saveProfile(validDraftInput);

    expect(firstResult.operationMode).toBe('updated');
    expect(secondResult.operationMode).toBe('updated');
    expect(mock.state.militaryRows).toHaveLength(1);
    expect(mock.state.civilRows).toHaveLength(1);
    expect(mock.state.civilRows[0]).toMatchObject({
      id: 'civ-existing',
      version_no: 3,
      military_profile_id: 'mil-existing',
      status: 'draft',
    });
  });

  it('uses civil fallback by highest version when current row is missing', async () => {
    const mock = createSupabaseMock({
      state: {
        militaryRows: [buildMilitaryRow({ id: 'mil-existing', is_current: true })],
        civilRows: [
          buildCivilRow({ id: 'civ-2', is_current: false, version_no: 2 }),
          buildCivilRow({ id: 'civ-5', is_current: false, version_no: 5 }),
        ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await saveProfile(validDraftInput);

    expect(result.operationMode).toBe('mixed');
    expect(mock.state.civilRows).toHaveLength(3);
    const inserted = mock.state.civilRows.find((row) => row.id === result.civilProfileId);
    expect(inserted).toMatchObject({
      version_no: 6,
      is_current: true,
      status: 'draft',
      military_profile_id: 'mil-existing',
    });
  });

  it('retries controlled on military uniqueness conflict and converges to update', async () => {
    const mock = createSupabaseMock({
      raceConflicts: {
        militaryInsertOnce: true,
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await saveProfile(validDraftInput);

    expect(result.operationMode).toBe('mixed');
    expect(result.militaryProfileId).toBe('mil-race');
    expect(mock.state.militaryRows).toHaveLength(1);
  });

  it('retries controlled on civil uniqueness conflict and converges to update', async () => {
    const mock = createSupabaseMock({
      state: {
        militaryRows: [
          buildMilitaryRow({ id: 'mil-existing', user_id: 'user-1', is_current: true }),
        ],
      },
      raceConflicts: {
        civilInsertOnce: true,
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await saveProfile(validDraftInput);

    expect(result.operationMode).toBe('updated');
    expect(result.civilProfileId).toBe('civ-race');
    expect(mock.state.civilRows).toHaveLength(1);
  });

  it('forces civil status draft even when input is tampered with external status', async () => {
    const mock = createSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const tamperedInput = {
      ...validDraftInput,
      civilianTarget: {
        ...validDraftInput.civilianTarget,
        status: 'ready',
      },
    } as unknown as typeof validDraftInput;

    const result = await saveProfile(tamperedInput);

    expect(result.status).toBe('draft');
    expect(mock.state.civilRows).toHaveLength(1);
    expect(mock.state.civilRows[0].status).toBe('draft');
  });

  it('converges on second call after civil failure post-military persistence', async () => {
    const mock = createSupabaseMock({
      errorsOnce: {
        'user_civil_profiles.insert': {
          message: 'insert into user_civil_profiles ...',
        },
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await expect(saveProfile(validDraftInput)).rejects.toThrow(
      'Error user_civil_profiles (insert current civil profile): error de persistencia en base de datos',
    );

    expect(mock.state.appRows).toHaveLength(1);
    expect(mock.state.militaryRows).toHaveLength(1);
    expect(mock.state.civilRows).toHaveLength(0);

    const retryResult = await saveProfile(validDraftInput);

    expect(retryResult).toEqual({
      status: 'draft',
      militaryProfileId: 'mil-101',
      civilProfileId: 'civ-101',
      operationMode: 'mixed',
    });
    expect(mock.state.militaryRows).toHaveLength(1);
    expect(mock.state.civilRows).toHaveLength(1);
    expect(mock.state.civilRows[0]).toMatchObject({
      military_profile_id: 'mil-101',
      status: 'draft',
      is_current: true,
    });
  });

  it('keeps legacy caller compatibility through updateProfile consumer', async () => {
    const mock = createSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await updateProfile(validDraftInput);

    expect(result).toBeUndefined();
    expect(mock.state.appRows).toHaveLength(1);
    expect(mock.state.militaryRows).toHaveLength(1);
    expect(mock.state.civilRows).toHaveLength(1);
    expect(mock.state.civilRows[0].status).toBe('draft');
  });

  it('maps app profile DB failures to domain-friendly errors', async () => {
    const mock = createSupabaseMock({
      errors: {
        'app_user_profiles.upsert': {
          message: 'insert into app_user_profiles ...',
        },
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await expect(saveProfile(validDraftInput)).rejects.toThrow(
      'Error app_user_profiles (upsert base profile): error de persistencia en base de datos',
    );
  });

  it('maps military DB failures to domain-friendly errors', async () => {
    const mock = createSupabaseMock({
      errors: {
        'user_military_profiles.insert': {
          message: 'insert into user_military_profiles ...',
        },
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await expect(saveProfile(validDraftInput)).rejects.toThrow(
      'Error user_military_profiles (insert current military profile): error de persistencia en base de datos',
    );
  });

  it('maps military update DB failures to domain-friendly errors', async () => {
    const mock = createSupabaseMock({
      state: {
        militaryRows: [
          buildMilitaryRow({ id: 'mil-existing', user_id: 'user-1', is_current: true }),
        ],
      },
      errors: {
        'user_military_profiles.update': {
          message: 'update user_military_profiles ...',
        },
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await expect(saveProfile(validDraftInput)).rejects.toThrow(
      'Error user_military_profiles (update current military profile): error de persistencia en base de datos',
    );
  });

  it('maps civil DB failures to domain-friendly errors', async () => {
    const mock = createSupabaseMock({
      state: {
        militaryRows: [buildMilitaryRow({ id: 'mil-existing', is_current: true })],
      },
      errors: {
        'user_civil_profiles.insert': {
          message: 'insert into user_civil_profiles ...',
        },
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await expect(saveProfile(validDraftInput)).rejects.toThrow(
      'Error user_civil_profiles (insert current civil profile): error de persistencia en base de datos',
    );
  });

  it('maps civil update DB failures to domain-friendly errors', async () => {
    const mock = createSupabaseMock({
      state: {
        militaryRows: [
          buildMilitaryRow({ id: 'mil-existing', user_id: 'user-1', is_current: true }),
        ],
        civilRows: [
          buildCivilRow({
            id: 'civ-existing',
            user_id: 'user-1',
            military_profile_id: 'mil-existing',
            is_current: true,
            version_no: 4,
          }),
        ],
      },
      errors: {
        'user_civil_profiles.update': {
          message: 'update user_civil_profiles ...',
        },
      },
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await expect(saveProfile(validDraftInput)).rejects.toThrow(
      'Error user_civil_profiles (update current civil profile): error de persistencia en base de datos',
    );
  });
});
