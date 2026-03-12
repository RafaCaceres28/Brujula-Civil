import { onboardingDraftSchema } from '../../wizard/schemas/wizard.schema';
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
    rank: { code: 'captain', label: 'Capitan' },
    specialty: { code: 'communications', label: 'Comunicaciones' },
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
    languages: [{ name: 'Ingles', level: 'advanced' }],
    officeTools: ['excel'],
    extraTraining: null,
  },
  objetivos: {
    targetRoles: [{ slug: 'operations-manager', label: 'Operations Manager' }],
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
}) {
  const records: {
    militaryUpdate?: Record<string, unknown>;
    militaryInsert?: Record<string, unknown>;
    civilUpdate?: Record<string, unknown>;
    civilInsert?: Record<string, unknown>;
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
                    data: { aggregated_draft_jsonb: draftFixture },
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
          update(payload: Record<string, unknown>) {
            records.militaryUpdate = payload;
            return {
              eq: async () => ({ error: null }),
            };
          },
          insert(payload: Record<string, unknown>) {
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
          update(payload: Record<string, unknown>) {
            records.civilUpdate = payload;
            return {
              eq: async () => ({ error: null }),
            };
          },
          insert: async (payload: Record<string, unknown>) => {
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
      rank_text: 'Capitan',
      specialty_text: 'Comunicaciones',
      service_years: 10,
    });

    expect(records.civilUpdate).toMatchObject({
      military_profile_id: 'mil-1',
      target_role: 'Operations Manager',
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
      target_role: 'Operations Manager',
      target_sector: 'logistics',
      is_current: true,
    });
  });
});
