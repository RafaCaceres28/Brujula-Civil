import { onboardingDraftSchema } from '../../wizard/schemas/wizard.schema';
import type {
  CivilProfileInsert,
  CivilProfileUpdate,
  MilitaryProfileInsert,
  MilitaryProfileUpdate,
} from '@/features/profile/types/profile.types';
import { createClient } from '@/lib/supabase/server';
import { describe, expect, it, vi } from 'vitest';
import { projectWizardToProfiles } from './project-wizard-to-profiles';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

const draftFixture = onboardingDraftSchema.parse({
  militar: {
    branch: 'army',
    corps: 'signals',
    rank: { code: 'captain', label: 'Capitán' },
    specialty: { code: 'communications', label: 'Comunicaciones / Sistemas' },
    serviceYears: 10,
    destinationContext: 'hq_staff',
    leadershipLevel: 'section_lead',
    teamSize: '6_15',
    unitName: 'Batallon Alfa',
    notes: null,
  },
  experiencia: {
    responsibilityAreas: ['operations'],
    missionTypes: ['intl_stability'],
    functionTypes: ['coordination'],
    tools: ['erp'],
    leadershipScopes: ['team_supervision'],
    achievements: ['Reduje incidencias operativas'],
    additionalContext: null,
  },
  competencias: {
    technicalSkills: ['operations_management'],
    softSkills: ['leadership'],
    certifications: ['quality_iso'],
    drivingLicenses: ['c'],
    languages: [{ name: 'english', level: 'advanced' }],
    officeTools: ['excel'],
    extraTraining: null,
  },
  objetivos: {
    targetRoles: [{ slug: 'project-manager', label: 'Gestor de Proyectos y Operaciones' }],
    targetSectors: ['logistics'],
    preferredLocations: ['madrid'],
    workModel: 'hybrid',
    seniority: 'manager',
    preferencesNotes: null,
  },
});

function createSupabaseMock(options: {
  currentMilitaryProfile: { id: string; raw_profile_jsonb?: Record<string, unknown> } | null;
  currentCivilProfile: {
    id: string;
    version_no: number;
    structured_profile_jsonb?: Record<string, unknown>;
  } | null;
  latestVersions?: Array<{ version_no: number }>;
  wizardDraft?: unknown;
  readError?:
    | 'user_wizard_state'
    | 'user_military_profiles'
    | 'user_civil_profiles'
    | 'latestVersion';
}) {
  const records: {
    militaryUpdate?: MilitaryProfileUpdate;
    militaryInsert?: MilitaryProfileInsert;
    civilUpdate?: CivilProfileUpdate;
    civilInsert?: CivilProfileInsert;
  } = {};

  const operations: string[] = [];
  const readError = (table: typeof options.readError) =>
    options.readError === table ? { message: 'read failed' } : null;
  const rawClient = {
    from(table: string) {
      if (table === 'user_wizard_state') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: { aggregated_draft_jsonb: options.wizardDraft ?? draftFixture },
                    error: readError('user_wizard_state'),
                  }),
                };
              },
            };
          },
        };
      }

      if (table === 'user_military_profiles') {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      maybeSingle: async () => ({
                        data: options.currentMilitaryProfile
                          ? { raw_profile_jsonb: {}, ...options.currentMilitaryProfile }
                          : null,
                        error: readError('user_military_profiles'),
                      }),
                    };
                  },
                };
              },
            };
          },
          update(payload: MilitaryProfileUpdate) {
            const filters: Record<string, unknown> = {};
            let rawGuard: unknown;
            const builder = {
              eq(column: string, value: unknown) {
                filters[column] = value;
                return builder;
              },
              filter(_column: string, _operator: string, value: string) {
                rawGuard = JSON.parse(value);
                return builder;
              },
              async select() {
                const matches =
                  filters.id === options.currentMilitaryProfile?.id &&
                  filters.user_id === 'user-1' &&
                  filters.is_current === true &&
                  JSON.stringify(rawGuard) ===
                    JSON.stringify(options.currentMilitaryProfile?.raw_profile_jsonb ?? {});
                if (matches) records.militaryUpdate = payload;
                return { data: matches ? [{ id: filters.id }] : [], error: null };
              },
            };
            return builder;
          },
          insert(payload: MilitaryProfileInsert) {
            records.militaryInsert = payload;
            return {
              select() {
                return {
                  single: async () => ({ data: { id: 'mil-new' }, error: null }),
                };
              },
            };
          },
        };
      }

      if (table === 'user_civil_profiles') {
        return {
          select(columns: string) {
            if (columns.startsWith('id, version_no')) {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        maybeSingle: async () => ({
                          data: options.currentCivilProfile
                            ? { structured_profile_jsonb: {}, ...options.currentCivilProfile }
                            : null,
                          error: readError('user_civil_profiles'),
                        }),
                      };
                    },
                  };
                },
              };
            }

            if (columns === 'version_no') {
              return {
                eq() {
                  return {
                    order() {
                      return {
                        limit: async () => ({
                          data: options.latestVersions ?? [],
                          error: readError('latestVersion'),
                        }),
                      };
                    },
                  };
                },
              };
            }

            throw new Error(`Unexpected column selection ${columns}`);
          },
          update(payload: CivilProfileUpdate) {
            records.civilUpdate = payload;
            return {
              eq: async () => ({ error: null }),
            };
          },
          insert: async (payload: CivilProfileInsert) => {
            records.civilInsert = payload;
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  const client = {
    from(table: string) {
      return new Proxy(rawClient.from(table), {
        get(target, property, receiver) {
          const method = Reflect.get(target, property, receiver);
          if (['select', 'upsert', 'insert', 'update', 'delete'].includes(String(property))) {
            return (...args: unknown[]) => {
              operations.push(`${table}.${String(property)}`);
              return Reflect.apply(method, target, args);
            };
          }
          return method;
        },
      });
    },
  };
  return { client, records, operations };
}

describe('projectWizardToProfiles', () => {
  it.each([{ experiences: [{ id: 'exp-1', activity: 'op_maintenance' }] }, { experiences: [] }])(
    'preserves canonical history %j and unrelated JSON while refreshing the wizard snapshot',
    async (careerHistory) => {
      const { client, records } = createSupabaseMock({
        currentMilitaryProfile: {
          id: 'mil-1',
          raw_profile_jsonb: {
            careerHistory,
            metadata: { keep: true },
            militar: { notes: 'old', metadata: { keep: true } },
          },
        },
        currentCivilProfile: {
          id: 'civ-1',
          version_no: 1,
          structured_profile_jsonb: {
            metadata: { keep: true },
            target: { metadata: { keep: true } },
          },
        },
        wizardDraft: { ...draftFixture, careerHistory: { experiences: [] } },
      });
      vi.mocked(createClient).mockResolvedValue(client as never);
      await projectWizardToProfiles('user-1');
      expect(records.militaryUpdate?.raw_profile_jsonb).toMatchObject({
        careerHistory,
        metadata: { keep: true },
        militar: { notes: null, metadata: { keep: true } },
      });
      expect(records.civilUpdate?.structured_profile_jsonb).toMatchObject({
        metadata: { keep: true },
        target: { metadata: { keep: true }, preferredLocations: ['madrid'] },
      });
      expect(records.civilUpdate?.structured_profile_jsonb).not.toHaveProperty('careerHistory');
    },
  );

  it('does not replace corrupt canonical history with a wizard snapshot', async () => {
    const { client, records, operations } = createSupabaseMock({
      currentMilitaryProfile: {
        id: 'mil-1',
        raw_profile_jsonb: {
          careerHistory: { experiences: [{ id: 'exp-1', activity: 'invalid' }] },
        },
      },
      currentCivilProfile: null,
    });
    vi.mocked(createClient).mockResolvedValue(client as never);
    await expect(projectWizardToProfiles('user-1')).rejects.toThrow();
    expect(records).toStrictEqual({});
    expect(operations.filter((operation) => !operation.endsWith('.select'))).toStrictEqual([]);
  });

  it.each([null, { id: 'mil-1' }])(
    'rejects corrupt civil snapshot before military insert or update: %j',
    async (currentMilitaryProfile) => {
      const { client, operations } = createSupabaseMock({
        currentMilitaryProfile,
        currentCivilProfile: { id: 'civ-1', version_no: 1, structured_profile_jsonb: [] as never },
      });
      vi.mocked(createClient).mockResolvedValue(client as never);
      await expect(projectWizardToProfiles('user-1')).rejects.toThrow();
      expect(operations.filter((operation) => !operation.endsWith('.select'))).toStrictEqual([]);
    },
  );

  it.each([
    'user_wizard_state',
    'user_military_profiles',
    'user_civil_profiles',
    'latestVersion',
  ] as const)('does not write when preflight read fails: %s', async (readError) => {
    const { client, operations } = createSupabaseMock({
      currentMilitaryProfile: null,
      currentCivilProfile: null,
      readError,
    });
    vi.mocked(createClient).mockResolvedValue(client as never);
    await expect(projectWizardToProfiles('user-1')).rejects.toThrow('read failed');
    expect(operations.filter((operation) => !operation.endsWith('.select'))).toStrictEqual([]);
  });

  it('rejects an invalid normalized wizard payload without writing', async () => {
    const { client, operations } = createSupabaseMock({
      currentMilitaryProfile: null,
      currentCivilProfile: null,
      wizardDraft: { ...draftFixture, militar: { ...draftFixture.militar, serviceYears: -1 } },
    });
    vi.mocked(createClient).mockResolvedValue(client as never);
    await expect(projectWizardToProfiles('user-1')).rejects.toThrow();
    expect(operations.filter((operation) => !operation.endsWith('.select'))).toStrictEqual([]);
  });

  it('updates current military and civil profiles when they exist', async () => {
    const { client, records } = createSupabaseMock({
      currentMilitaryProfile: { id: 'mil-1' },
      currentCivilProfile: { id: 'civ-1', version_no: 4 },
    });

    vi.mocked(createClient).mockResolvedValue(client as never);

    await projectWizardToProfiles('user-1');

    expect(records.militaryUpdate).toMatchObject({
      branch: 'army',
      component: 'signals',
      rank_text: 'Capitán',
      specialty_text: 'Comunicaciones / Sistemas',
      service_years: 10,
    });

    expect(records.civilUpdate).toMatchObject({
      military_profile_id: 'mil-1',
      target_role: 'Gestor de Proyectos y Operaciones',
      target_sector: 'logistics',
      status: 'draft',
    });
  });

  it('inserts profiles when current rows do not exist', async () => {
    const { client, records, operations } = createSupabaseMock({
      currentMilitaryProfile: null,
      currentCivilProfile: null,
      latestVersions: [{ version_no: 2 }],
    });

    vi.mocked(createClient).mockResolvedValue(client as never);

    await projectWizardToProfiles('user-1');

    expect(records.militaryInsert).toMatchObject({
      user_id: 'user-1',
      is_current: true,
      branch: 'army',
      component: 'signals',
    });

    expect(records.civilInsert).toMatchObject({
      user_id: 'user-1',
      military_profile_id: 'mil-new',
      version_no: 3,
      target_role: 'Gestor de Proyectos y Operaciones',
      target_sector: 'logistics',
      is_current: true,
    });
    expect(operations).toStrictEqual([
      'user_wizard_state.select',
      'user_military_profiles.select',
      'user_civil_profiles.select',
      'user_civil_profiles.select',
      'user_military_profiles.insert',
      'user_civil_profiles.insert',
    ]);
    expect(records.militaryInsert?.raw_profile_jsonb).not.toHaveProperty('careerHistory');
  });

  it('keeps compatibility with mixed legacy-guided wizard drafts on projection', async () => {
    const { client, records } = createSupabaseMock({
      currentMilitaryProfile: null,
      currentCivilProfile: null,
      latestVersions: [{ version_no: 0 }],
      wizardDraft: {
        militar: {
          branch: 'Ejército de Tierra',
          corps: 'Ingenieros y Zapadores',
          rank: { code: 'captain', label: 'Capitán' },
          specialty: { code: 'Comunicaciones / Sistemas', label: 'legacy' },
          serviceYears: 12,
        },
        experiencia: {
          responsibilityAreas: ['Operaciones y Ejecución', 'legacy-invalid'],
        },
        competencias: {
          technicalSkills: ['Gestión de Operaciones'],
        },
        objetivos: {
          targetRoles: ['Coordinador de Operaciones y Logística'],
          targetSectors: ['Logística y Transporte'],
        },
      },
    });

    vi.mocked(createClient).mockResolvedValue(client as never);

    await expect(projectWizardToProfiles('user-1')).resolves.toBeUndefined();

    expect(records.militaryInsert).toMatchObject({
      branch: 'army',
      component: 'engineers',
      rank_text: 'Capitán',
      specialty_text: 'Comunicaciones / Sistemas',
      service_years: 12,
    });
    expect(records.civilInsert).toMatchObject({
      target_role: 'Coordinador de Operaciones y Logística',
      target_sector: 'logistics',
      version_no: 1,
    });
  });
});
