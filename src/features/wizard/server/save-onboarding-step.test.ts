import { createClient } from '@/lib/supabase/server';
import { onboardingDraftSchema } from '../schemas/wizard.schema';
import { describe, expect, it, vi } from 'vitest';
import { saveOnboardingStep } from './save-onboarding-step';
import { recalculateOnboardingState } from './recalculate-onboarding-state';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('./recalculate-onboarding-state', () => ({
  recalculateOnboardingState: vi.fn(),
}));

function createSupabaseMock() {
  const calls: {
    upsert?: Record<string, unknown>;
    updateDraft?: Record<string, unknown>;
  } = {};

  const client = {
    from(table: string) {
      if (table === 'wizard_step_states') {
        return {
          upsert: async (payload: Record<string, unknown>) => {
            calls.upsert = payload;
            return { error: null };
          },
        };
      }

      if (table === 'user_wizard_state') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: {
                      aggregated_draft_jsonb: {
                        ...onboardingDraftSchema.parse({
                          experiencia: {
                            responsibilityAreas: ['operations'],
                            missionTypes: ['intl_stability'],
                            functionTypes: ['coordination'],
                            tools: ['erp'],
                            leadershipScopes: ['team_supervision'],
                            achievements: ['Mantuve SLA operativo'],
                            additionalContext: null,
                          },
                        }),
                        employabilityFlow: {
                          recommendations: {
                            recommendationSetId: 'recset-snapshot-1-20260324010101',
                            generatedAt: '2026-03-24T01:01:01.000Z',
                            sourceSnapshotId: 'snapshot-1',
                            routes: [
                              {
                                routeId: 'route-operations-coordinator-logistics-mid',
                                roleId: 'operations-coordinator',
                                sectorId: 'logistics',
                                seniorityId: 'mid',
                                reasonSummary:
                                  'Se recomienda por coincidencias de logistica y coordinacion.',
                                matchedSignals: ['TARGET_ROLE_HINT'],
                              },
                              {
                                routeId: 'route-project-manager-consulting-mid',
                                roleId: 'project-manager',
                                sectorId: 'consulting',
                                seniorityId: 'mid',
                                reasonSummary:
                                  'Se recomienda por coincidencias de planificacion y liderazgo.',
                                matchedSignals: ['TARGET_SECTOR_HINT'],
                              },
                              {
                                routeId: 'route-team-lead-technology-mid',
                                roleId: 'team-lead',
                                sectorId: 'technology',
                                seniorityId: 'mid',
                                reasonSummary:
                                  'Se recomienda por coincidencias de supervision y comunicacion.',
                                matchedSignals: ['LEADERSHIP_MATCH'],
                              },
                            ],
                          },
                          selectedRoute: {
                            recommendationSetId: 'recset-snapshot-1-20260324010101',
                            selectedRouteId: 'route-operations-coordinator-logistics-mid',
                            selectedAt: '2026-03-24T01:02:03.000Z',
                          },
                          selectedRouteContext: {
                            recommendationSetId: 'recset-snapshot-1-20260324010101',
                            selectedRouteId: 'route-operations-coordinator-logistics-mid',
                            reasonSummarySnapshot:
                              'Se recomienda por coincidencias de logistica y coordinacion.',
                            fitLabelSnapshot: 'alto',
                            guidanceSnapshot:
                              'Priorizala si quieres continuidad operativa inmediata.',
                            capturedAt: '2026-03-24T01:02:03.000Z',
                          },
                          cvPreviewDraft: {
                            previewVersionId: 'preview-v1',
                            isUserEdited: true,
                          },
                        },
                      },
                    },
                    error: null,
                  }),
                };
              },
            };
          },
          update(payload: Record<string, unknown>) {
            calls.updateDraft = payload;
            return {
              eq: async () => ({ error: null }),
            };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  return { client, calls };
}

describe('saveOnboardingStep', () => {
  it('upserts step state, merges draft, and recalculates wizard state', async () => {
    const { client, calls } = createSupabaseMock();

    vi.mocked(createClient).mockResolvedValue(client as never);
    vi.mocked(recalculateOnboardingState).mockResolvedValue({
      currentStep: 'missions_achievements',
      lastCompletedStep: 'military_background',
      completionPercent: 20,
      isCompleted: false,
    });

    const payload = {
      branch: 'army',
      corps: 'signals',
      rank: { code: 'captain', label: 'Capitán' },
      specialty: { code: 'communications', label: 'Comunicaciones / Sistemas' },
      serviceYears: 9,
      destinationContext: 'hq_staff',
      leadershipLevel: 'section_lead',
      teamSize: '6_15',
      unitName: 'Batallon Alfa',
      notes: null,
    };

    await saveOnboardingStep('user-1', 'militar', payload, { markCompleted: true });

    expect(calls.upsert).toMatchObject({
      user_id: 'user-1',
      step_key: 'military_background',
      step_order: 1,
      is_completed: true,
      payload_jsonb: payload,
    });

    expect(calls.updateDraft).toBeDefined();
    const mergedDraft = calls.updateDraft?.aggregated_draft_jsonb as Record<string, unknown>;
    expect(mergedDraft.militar).toEqual(payload);
    expect(mergedDraft.experiencia).toMatchObject({
      responsibilityAreas: ['operations'],
    });
    expect(mergedDraft.employabilityFlow).toMatchObject({
      recommendations: {
        recommendationSetId: 'recset-snapshot-1-20260324010101',
      },
      selectedRoute: {
        selectedRouteId: 'route-operations-coordinator-logistics-mid',
      },
      selectedRouteContext: {
        selectedRouteId: 'route-operations-coordinator-logistics-mid',
        fitLabelSnapshot: 'alto',
      },
      cvPreviewDraft: {
        previewVersionId: 'preview-v1',
      },
      lastOnboardingStep: 'militar',
    });

    expect(recalculateOnboardingState).toHaveBeenCalledWith('user-1');
  });

  it('rejects payload with structured values outside catalog before persistence', async () => {
    const { client, calls } = createSupabaseMock();

    vi.mocked(createClient).mockResolvedValue(client as never);

    await expect(
      saveOnboardingStep(
        'user-1',
        'militar',
        {
          branch: 'valor-libre',
          corps: 'signals',
          rank: { code: 'captain', label: 'Capitán' },
          specialty: { code: 'communications', label: 'Comunicaciones / Sistemas' },
          serviceYears: 9,
          destinationContext: 'hq_staff',
          leadershipLevel: 'section_lead',
          teamSize: '6_15',
          unitName: 'Batallon Alfa',
          notes: null,
        },
        { markCompleted: true },
      ),
    ).rejects.toThrow('Selecciona un valor válido del catálogo');

    expect(calls.upsert).toBeUndefined();
    expect(calls.updateDraft).toBeUndefined();
  });

  it('rejects manipulated structured labels before persistence', async () => {
    const { client, calls } = createSupabaseMock();

    vi.mocked(createClient).mockResolvedValue(client as never);

    await expect(
      saveOnboardingStep(
        'user-1',
        'objetivos',
        {
          targetRoles: [
            {
              slug: 'operations-coordinator',
              label: 'Rol libre manipulado',
            },
          ],
          targetSectors: ['logistics'],
          preferredLocations: ['madrid'],
          workModel: 'hybrid',
          seniority: 'manager',
          preferencesNotes: 'Narrativo permitido',
        },
        { markCompleted: true },
      ),
    ).rejects.toThrow('Selecciona un rol objetivo válido del catálogo');

    expect(calls.upsert).toBeUndefined();
    expect(calls.updateDraft).toBeUndefined();
  });

  it('keeps legacy employabilityFlow payload intact during defensive draft merge', async () => {
    const { client, calls } = createSupabaseMock();

    vi.mocked(createClient).mockResolvedValue(client as never);
    vi.mocked(recalculateOnboardingState).mockResolvedValue({
      currentStep: 'skills_tools',
      lastCompletedStep: 'missions_achievements',
      completionPercent: 60,
      isCompleted: false,
    });

    await saveOnboardingStep(
      'user-1',
      'objetivos',
      {
        targetRoles: [{ slug: 'project-manager', label: 'Gestor de Proyectos y Operaciones' }],
        targetSectors: ['consulting'],
        preferredLocations: ['madrid'],
        workModel: 'hybrid',
        seniority: 'manager',
        preferencesNotes: 'Priorizar continuidad de liderazgo.',
      },
      { markCompleted: true },
    );

    const mergedDraft = calls.updateDraft?.aggregated_draft_jsonb as Record<string, unknown>;
    const mergedFlow = mergedDraft.employabilityFlow as Record<string, unknown>;

    expect(mergedFlow).toMatchObject({
      recommendations: {
        recommendationSetId: 'recset-snapshot-1-20260324010101',
      },
      selectedRoute: {
        selectedRouteId: 'route-operations-coordinator-logistics-mid',
      },
      selectedRouteContext: {
        selectedRouteId: 'route-operations-coordinator-logistics-mid',
        fitLabelSnapshot: 'alto',
      },
      cvPreviewDraft: {
        previewVersionId: 'preview-v1',
      },
      lastOnboardingStep: 'objetivos',
    });
    expect(typeof mergedFlow.lastUpdatedAt).toBe('string');
  });
});
