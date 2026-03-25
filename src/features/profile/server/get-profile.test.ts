import { profileReadOutputSchema } from '../schemas/profile.schema';
import type {
  AppUserProfileRow,
  UserCivilProfileRow,
  UserMilitaryProfileRow,
} from '@/types/database.types';
import { createClient } from '@/lib/supabase/server';
import { describe, expect, it, vi } from 'vitest';
import { getProfile } from './get-profile';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

type TableName = 'app_user_profiles' | 'user_military_profiles' | 'user_civil_profiles';

type QueryScenario = {
  appRows: AppUserProfileRow[];
  militaryRows: UserMilitaryProfileRow[];
  civilRows: UserCivilProfileRow[];
  errors?: Partial<Record<TableName, string>>;
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

  if (left === undefined || left === null) {
    return ascending ? -1 : 1;
  }

  if (right === undefined || right === null) {
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
      const result = compareValues(left[order.column], right[order.column], order.ascending);
      if (result !== 0) {
        return result;
      }
    }

    return 0;
  });
}

function createSupabaseMock(scenario: QueryScenario) {
  function rowsForTable(table: TableName) {
    switch (table) {
      case 'app_user_profiles':
        return scenario.appRows;
      case 'user_military_profiles':
        return scenario.militaryRows;
      case 'user_civil_profiles':
        return scenario.civilRows;
    }
  }

  function hasError(table: TableName): string | null {
    return scenario.errors?.[table] ?? null;
  }

  function runQuery(table: TableName, state: QueryState) {
    const errorMessage = hasError(table);
    if (errorMessage) {
      return {
        data: [] as Record<string, unknown>[],
        error: { message: errorMessage },
      };
    }

    let rows = rowsForTable(table).filter((row) => {
      const candidate = row as Record<string, unknown>;
      return Object.entries(state.filters).every(([column, value]) => candidate[column] === value);
    });

    rows = sortRows(rows, state.orders);

    if (state.limitValue !== null) {
      rows = rows.slice(0, state.limitValue);
    }

    return {
      data: rows,
      error: null,
    };
  }

  return {
    from(table: TableName) {
      return {
        select() {
          const state: QueryState = {
            filters: {},
            orders: [],
            limitValue: null,
          };

          const builder = {
            eq(column: string, value: unknown) {
              state.filters[column] = value;
              return builder;
            },
            order(column: string, options?: { ascending?: boolean }) {
              state.orders.push({ column, ascending: options?.ascending ?? true });
              return builder;
            },
            async limit(value: number) {
              state.limitValue = value;
              return runQuery(table, state);
            },
            async maybeSingle() {
              const errorMessage = hasError(table);
              if (errorMessage) {
                return {
                  data: null,
                  error: { message: errorMessage },
                };
              }

              const rows = rowsForTable(table).filter((row) => {
                const candidate = row as Record<string, unknown>;
                return Object.entries(state.filters).every(
                  ([column, value]) => candidate[column] === value,
                );
              });

              return {
                data: rows[0] ?? null,
                error: null,
              };
            },
          };

          return builder;
        },
      };
    },
  };
}

const appProfile: AppUserProfileRow = {
  user_id: 'user-1',
  email: 'ada@example.com',
  display_name: 'Ada Lovelace',
  locale: 'es-ES',
  timezone: 'Europe/Madrid',
  onboarding_completed: false,
  marketing_opt_in: false,
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:00:00.000Z',
};

function buildMilitaryRow(overrides: Partial<UserMilitaryProfileRow>): UserMilitaryProfileRow {
  return {
    id: overrides.id ?? 'mil-1',
    user_id: overrides.user_id ?? 'user-1',
    is_current: overrides.is_current ?? true,
    branch: overrides.branch ?? 'army',
    component: overrides.component ?? 'signals',
    rank_text: overrides.rank_text ?? 'Captain',
    specialty_text: overrides.specialty_text ?? 'Comms',
    service_years: overrides.service_years ?? 8,
    latest_unit: overrides.latest_unit ?? 'Unit A',
    latest_role_title: overrides.latest_role_title ?? 'Lead',
    source_text: overrides.source_text ?? 'Military summary',
    raw_profile_jsonb: overrides.raw_profile_jsonb ?? {},
    created_at: overrides.created_at ?? '2026-01-01T10:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-01-03T10:00:00.000Z',
  };
}

function buildCivilRow(overrides: Partial<UserCivilProfileRow>): UserCivilProfileRow {
  return {
    id: overrides.id ?? 'civ-1',
    user_id: overrides.user_id ?? 'user-1',
    military_profile_id: overrides.military_profile_id ?? 'mil-1',
    version_no: overrides.version_no ?? 3,
    is_current: overrides.is_current ?? true,
    status: overrides.status ?? 'ready',
    target_role: overrides.target_role ?? 'Operations Manager',
    target_sector: overrides.target_sector ?? 'Logistics',
    headline: overrides.headline ?? null,
    summary: overrides.summary ?? null,
    structured_profile_jsonb: overrides.structured_profile_jsonb ?? {
      target: {
        preferredLocations: ['Madrid'],
      },
    },
    generator_name: overrides.generator_name ?? null,
    generator_version: overrides.generator_version ?? null,
    prompt_version: overrides.prompt_version ?? null,
    created_at: overrides.created_at ?? '2026-01-01T10:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-01-03T10:00:00.000Z',
  };
}

describe('getProfile', () => {
  it('returns consolidated profile in happy path', async () => {
    const supabase = createSupabaseMock({
      appRows: [appProfile],
      militaryRows: [buildMilitaryRow({ id: 'mil-1' })],
      civilRows: [buildCivilRow({ id: 'civ-1' })],
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await getProfile('user-1');

    expect(result).not.toBeNull();
    expect(profileReadOutputSchema.parse(result)).toEqual(result);
    expect(result).toMatchObject({
      userId: 'user-1',
      profile: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
      },
      militaryBackground: {
        rank: 'Captain',
      },
      civilianTarget: {
        targetRole: 'Operations Manager',
        locationPreference: 'Madrid',
      },
    });
  });

  it('returns profile with defaults when military and civil rows are missing', async () => {
    const supabase = createSupabaseMock({
      appRows: [appProfile],
      militaryRows: [],
      civilRows: [],
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await getProfile('user-1');

    expect(result).toMatchObject({
      userId: 'user-1',
      militaryBackground: {
        rank: null,
        area: null,
        yearsOfService: null,
        summary: null,
      },
      civilianTarget: {
        targetRole: null,
        targetSector: null,
        locationPreference: null,
      },
    });
  });

  it('returns null location preference when civil structured profile misses preferredLocations', async () => {
    const supabase = createSupabaseMock({
      appRows: [appProfile],
      militaryRows: [buildMilitaryRow({ id: 'mil-1' })],
      civilRows: [
        buildCivilRow({
          id: 'civ-1',
          structured_profile_jsonb: {
            target: {},
          },
        }),
      ],
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const resultPromise = getProfile('user-1');

    await expect(resultPromise).resolves.not.toBeNull();

    const result = await resultPromise;

    expect(result?.civilianTarget.locationPreference).toBeNull();
  });

  it('normalizes oversized military source_text to avoid runtime zod too_big errors', async () => {
    const supabase = createSupabaseMock({
      appRows: [appProfile],
      militaryRows: [
        buildMilitaryRow({
          id: 'mil-oversized',
          source_text: `${'x'.repeat(520)}   `,
        }),
      ],
      civilRows: [buildCivilRow({ id: 'civ-1' })],
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await getProfile('user-1');

    expect(result?.militaryBackground.summary).toHaveLength(500);
    expect(result?.militaryBackground.summary).toBe('x'.repeat(500));
  });

  it('resolves duplicated current military and civil rows deterministically', async () => {
    const supabase = createSupabaseMock({
      appRows: [appProfile],
      militaryRows: [
        buildMilitaryRow({
          id: 'mil-a',
          updated_at: '2026-01-10T10:00:00.000Z',
          rank_text: 'Major',
          is_current: true,
        }),
        buildMilitaryRow({
          id: 'mil-z',
          updated_at: '2026-01-10T10:00:00.000Z',
          rank_text: 'Colonel',
          is_current: true,
        }),
      ],
      civilRows: [
        buildCivilRow({
          id: 'civ-a',
          version_no: 4,
          updated_at: '2026-01-10T11:00:00.000Z',
          target_role: 'Role A',
          is_current: true,
        }),
        buildCivilRow({
          id: 'civ-z',
          version_no: 4,
          updated_at: '2026-01-10T11:00:00.000Z',
          target_role: 'Role Z',
          is_current: true,
        }),
      ],
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await getProfile('user-1');

    expect(result?.militaryBackground.rank).toBe('Colonel');
    expect(result?.civilianTarget.targetRole).toBe('Role Z');
  });

  it('falls back to highest civil version when no current civil exists', async () => {
    const supabase = createSupabaseMock({
      appRows: [appProfile],
      militaryRows: [buildMilitaryRow({ id: 'mil-1' })],
      civilRows: [
        buildCivilRow({ is_current: false, version_no: 2, target_role: 'Role 2', id: 'civ-2' }),
        buildCivilRow({ is_current: false, version_no: 5, target_role: 'Role 5', id: 'civ-5' }),
      ],
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);

    const result = await getProfile('user-1');

    expect(result?.civilianTarget.targetRole).toBe('Role 5');
  });

  it('returns null when base app profile does not exist', async () => {
    const supabase = createSupabaseMock({
      appRows: [],
      militaryRows: [buildMilitaryRow({ id: 'mil-1' })],
      civilRows: [buildCivilRow({ id: 'civ-1' })],
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await expect(getProfile('user-1')).resolves.toBeNull();
  });

  it('throws contextual error when app query fails', async () => {
    const supabase = createSupabaseMock({
      appRows: [appProfile],
      militaryRows: [],
      civilRows: [],
      errors: {
        app_user_profiles: 'db timeout',
      },
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await expect(getProfile('user-1')).rejects.toThrow(
      'Error loading app_user_profiles (select base profile): db timeout',
    );
  });

  it('throws contextual error when military query fails', async () => {
    const supabase = createSupabaseMock({
      appRows: [appProfile],
      militaryRows: [],
      civilRows: [],
      errors: {
        user_military_profiles: 'network error',
      },
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await expect(getProfile('user-1')).rejects.toThrow(
      'Error loading user_military_profiles (select current military profile): network error',
    );
  });

  it('throws contextual error when civil query fails', async () => {
    const supabase = createSupabaseMock({
      appRows: [appProfile],
      militaryRows: [buildMilitaryRow({})],
      civilRows: [],
      errors: {
        user_civil_profiles: 'permission denied',
      },
    });

    vi.mocked(createClient).mockResolvedValue(supabase as never);

    await expect(getProfile('user-1')).rejects.toThrow(
      'Error loading user_civil_profiles (select current civil profile): permission denied',
    );
  });
});
