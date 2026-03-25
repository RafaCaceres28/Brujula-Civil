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
  currentMilitaryProfile: { id: string } | null;
  currentCivilProfile: { id: string; version_no: number } | null;
  latestVersions?: Array<{ version_no: number }>;
  wizardDraft?: unknown;
}) {
  const records: {
    militaryUpdate?: MilitaryProfileUpdate;
    militaryInsert?: MilitaryProfileInsert;
    civilUpdate?: CivilProfileUpdate;
    civilInsert?: CivilProfileInsert;
  } = {};

  const client = {
    from(table: string) {
      if (table === 'user_wizard_state') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: { aggregated_draft_jsonb: options.wizardDraft ?? draftFixture },
                    error: null,
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
                        data: options.currentMilitaryProfile,
                        error: null,
                      }),
                    };
                  },
                };
              },
            };
          },
          update(payload: MilitaryProfileUpdate) {
            records.militaryUpdate = payload;
            return {
              eq: async () => ({ error: null }),
            };
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
            if (columns === 'id, version_no') {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        maybeSingle: async () => ({
                          data: options.currentCivilProfile,
                          error: null,
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
                        limit: async () => ({ data: options.latestVersions ?? [], error: null }),
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

  return { client, records };
}

describe('projectWizardToProfiles', () => {
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
    const { client, records } = createSupabaseMock({
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
