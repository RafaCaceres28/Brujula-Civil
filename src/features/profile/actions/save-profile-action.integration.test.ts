import { createClient } from '@/lib/supabase/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveDraftAction } from './save-profile-action';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

type TableName = 'app_user_profiles' | 'user_military_profiles' | 'user_civil_profiles';

type QueryState = {
  filters: Record<string, unknown>;
  limitValue: number | null;
};

function createDraftIntegrationClientMock() {
  const writes = {
    upsert: 0,
    insert: 0,
    update: 0,
  };

  const state = {
    appRows: [] as Array<Record<string, unknown>>,
    militaryRows: [] as Array<Record<string, unknown>>,
    civilRows: [] as Array<Record<string, unknown>>,
  };

  const client = {
    from(table: TableName) {
      return {
        select() {
          const queryState: QueryState = {
            filters: {},
            limitValue: null,
          };

          const queryBuilder = {
            eq(column: string, value: unknown) {
              queryState.filters[column] = value;
              return queryBuilder;
            },
            order() {
              return queryBuilder;
            },
            async limit(value: number) {
              queryState.limitValue = value;

              if (table === 'user_military_profiles') {
                return {
                  data: state.militaryRows
                    .filter((row) => {
                      return Object.entries(queryState.filters).every(
                        ([column, expected]) => row[column] === expected,
                      );
                    })
                    .slice(0, queryState.limitValue),
                  error: null,
                };
              }

              if (table === 'user_civil_profiles') {
                return {
                  data: state.civilRows
                    .filter((row) => {
                      return Object.entries(queryState.filters).every(
                        ([column, expected]) => row[column] === expected,
                      );
                    })
                    .slice(0, queryState.limitValue),
                  error: null,
                };
              }

              return {
                data: [] as Array<Record<string, unknown>>,
                error: null,
              };
            },
          };

          return queryBuilder;
        },
        async upsert(payload: Record<string, unknown>) {
          writes.upsert += 1;

          if (table === 'app_user_profiles') {
            state.appRows.push(payload);
          }

          return { error: null };
        },
        update() {
          return {
            async eq() {
              writes.update += 1;
              return { error: null };
            },
          };
        },
        insert(payload: Record<string, unknown>) {
          return {
            select() {
              return {
                async single() {
                  writes.insert += 1;

                  if (table === 'user_military_profiles') {
                    const row = {
                      id: 'mil-101',
                      ...payload,
                    };
                    state.militaryRows.push(row);
                    return { data: { id: row.id }, error: null };
                  }

                  if (table === 'user_civil_profiles') {
                    const row = {
                      id: 'civ-101',
                      ...payload,
                    };
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
    writes,
  };
}

describe('saveDraftAction -> saveProfile integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses draft input and persists normalized payload through server use case', async () => {
    const mock = createDraftIntegrationClientMock();
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await saveDraftAction({
      userId: 'user-1',
      profile: {
        fullName: '  Ada Lovelace  ',
        email: '  ADA@EXAMPLE.COM  ',
        phone: '  ',
        city: '  Madrid  ',
      },
      militaryBackground: {
        rank: '  Captain  ',
        area: '  Signals  ',
        yearsOfService: 7,
        summary: '  Led teams  ',
      },
      civilianTarget: {
        targetRole: '  Operations Manager  ',
        targetSector: '  Logistics  ',
        locationPreference: '  Remote  ',
      },
    });

    expect(result).toEqual({
      status: 'draft',
      militaryProfileId: 'mil-101',
      civilProfileId: 'civ-101',
      operationMode: 'created',
    });
    expect(mock.writes).toEqual({
      upsert: 1,
      insert: 2,
      update: 0,
    });
    expect(mock.state.appRows[0]).toMatchObject({
      user_id: 'user-1',
      display_name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
    expect(mock.state.civilRows[0]).toMatchObject({
      status: 'draft',
    });
  });

  it('fails validation and executes NO write-side operation on invalid draft payload', async () => {
    const mock = createDraftIntegrationClientMock();
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    await expect(
      saveDraftAction({
        userId: '',
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
      }),
    ).rejects.toMatchObject({
      kind: 'validation',
      name: 'ProfileActionError',
    });

    expect(createClient).not.toHaveBeenCalled();
    expect(mock.writes).toEqual({
      upsert: 0,
      insert: 0,
      update: 0,
    });
  });
});
