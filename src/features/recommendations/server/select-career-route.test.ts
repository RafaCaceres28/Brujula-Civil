import { createClient } from '@/lib/supabase/server';
import { describe, expect, it, vi } from 'vitest';
import { selectCareerRoute } from './select-career-route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

type SelectCareerRouteMockOptions = {
  withRecommendations?: boolean;
  recommendationSetId?: string;
  routes?: Array<Record<string, unknown>>;
};

function createSupabaseMock(options?: SelectCareerRouteMockOptions) {
  const withRecommendations = options?.withRecommendations ?? true;
  const recommendationSetId = options?.recommendationSetId ?? 'recset-snapshot-1-20260324010101';
  const routes = options?.routes ?? [
    {
      routeId: 'route-operations-coordinator-logistics-mid',
      roleId: 'operations-coordinator',
      sectorId: 'logistics',
      seniorityId: 'mid',
      reasonSummary: 'Se recomienda por coincidencias de logistica y coordinacion.',
      matchedSignals: ['TARGET_ROLE_HINT'],
      explanation: {
        reasonSummary: 'Se recomienda por coincidencias de logistica y coordinacion.',
        fitLabel: 'alto',
        fitScore: 88,
        explanationKeywords: ['logistica', 'coordinacion'],
        decisionGuidance: 'Priorizala si quieres continuidad operativa inmediata.',
      },
    },
    {
      routeId: 'route-project-manager-consulting-mid',
      roleId: 'project-manager',
      sectorId: 'consulting',
      seniorityId: 'mid',
      reasonSummary: 'Se recomienda por coincidencias de planificacion y liderazgo.',
      matchedSignals: ['TARGET_SECTOR_HINT'],
      explanation: {
        reasonSummary: 'Se recomienda por coincidencias de planificacion y liderazgo.',
        fitLabel: 'medio',
        fitScore: 70,
        explanationKeywords: ['planificacion', 'liderazgo'],
        decisionGuidance: 'Comparala si buscas equilibrio entre estrategia y ejecucion.',
      },
    },
    {
      routeId: 'route-team-lead-technology-mid',
      roleId: 'team-lead',
      sectorId: 'technology',
      seniorityId: 'mid',
      reasonSummary: 'Se recomienda por coincidencias de supervision y comunicacion.',
      matchedSignals: ['LEADERSHIP_MATCH'],
      explanation: {
        reasonSummary: 'Se recomienda por coincidencias de supervision y comunicacion.',
        fitLabel: 'medio',
        fitScore: 64,
        explanationKeywords: ['supervision', 'comunicacion'],
        decisionGuidance: 'Usala para evaluar un paso a liderazgo tecnico.',
      },
    },
  ];

  const calls: {
    updateDraft?: Record<string, unknown>;
  } = {};

  const client = {
    from(table: string) {
      if (table !== 'user_wizard_state') {
        throw new Error(`Unexpected table ${table}`);
      }

      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({
                  data: {
                    aggregated_draft_jsonb: {
                      employabilityFlow: {
                        ...(withRecommendations
                          ? {
                              recommendations: {
                                recommendationSetId,
                                generatedAt: '2026-03-24T01:01:01.000Z',
                                sourceSnapshotId: 'snapshot-1',
                                routes,
                              },
                            }
                          : {}),
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
    },
  };

  return { client, calls };
}

describe('selectCareerRoute', () => {
  it('persists selected route when route belongs to active recommendation set', async () => {
    const { client, calls } = createSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await selectCareerRoute({
      userId: 'user-1',
      recommendationSetId: 'recset-snapshot-1-20260324010101',
      selectedRouteId: 'route-operations-coordinator-logistics-mid',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const mergedDraft = calls.updateDraft?.aggregated_draft_jsonb as Record<string, unknown>;
    expect(mergedDraft.employabilityFlow).toMatchObject({
      selectedRoute: {
        recommendationSetId: 'recset-snapshot-1-20260324010101',
        selectedRouteId: 'route-operations-coordinator-logistics-mid',
      },
      selectedRouteContext: {
        recommendationSetId: 'recset-snapshot-1-20260324010101',
        selectedRouteId: 'route-operations-coordinator-logistics-mid',
        reasonSummarySnapshot: 'Se recomienda por coincidencias de logistica y coordinacion.',
        fitLabelSnapshot: 'alto',
        guidanceSnapshot: 'Priorizala si quieres continuidad operativa inmediata.',
      },
      selectedRecommendation: {
        recommendationSetId: 'recset-snapshot-1-20260324010101',
        selectedRouteId: 'route-operations-coordinator-logistics-mid',
      },
    });
  });

  it('rejects route that does not belong to recommendation set', async () => {
    const { client, calls } = createSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await selectCareerRoute({
      userId: 'user-1',
      recommendationSetId: 'recset-snapshot-1-20260324010101',
      selectedRouteId: 'route-does-not-exist',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.message).toBe(
      'Selected route does not belong to active recommendation set',
    );
    expect(calls.updateDraft).toBeUndefined();
  });

  it('returns stale-context marker and reprocess action when recommendation set drift is detected', async () => {
    const { client, calls } = createSupabaseMock({
      recommendationSetId: 'recset-snapshot-2-20260325020202',
    });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await selectCareerRoute({
      userId: 'user-1',
      recommendationSetId: 'recset-snapshot-1-20260324010101',
      selectedRouteId: 'route-operations-coordinator-logistics-mid',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.details).toMatchObject({
      activeRecommendationSetId: 'recset-snapshot-2-20260325020202',
      requestedRecommendationSetId: 'recset-snapshot-1-20260324010101',
      staleExplanationContext: true,
      reprocessAction: 'refresh_recommendations',
    });
    expect(calls.updateDraft).toBeUndefined();
  });

  it('keeps backward compatibility with legacy reason codes when explanation is missing', async () => {
    const { client, calls } = createSupabaseMock({
      routes: [
        {
          routeId: 'route-operations-coordinator-logistics-mid',
          roleId: 'operations-coordinator',
          sectorId: 'logistics',
          seniorityId: 'mid',
          reasonSummary: 'Se recomienda por experiencia transferible en coordinacion.',
          matchedSignals: ['LEGACY_CODE_NOT_MAPPED'],
        },
        {
          routeId: 'route-project-manager-consulting-mid',
          roleId: 'project-manager',
          sectorId: 'consulting',
          seniorityId: 'mid',
          reasonSummary: 'Se recomienda por planificacion operativa.',
          matchedSignals: ['TARGET_SECTOR_HINT'],
        },
        {
          routeId: 'route-team-lead-technology-mid',
          roleId: 'team-lead',
          sectorId: 'technology',
          seniorityId: 'mid',
          reasonSummary: 'Se recomienda por supervision de equipos.',
          matchedSignals: ['LEADERSHIP_MATCH'],
        },
      ],
    });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await selectCareerRoute({
      userId: 'user-1',
      recommendationSetId: 'recset-snapshot-1-20260324010101',
      selectedRouteId: 'route-operations-coordinator-logistics-mid',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const mergedDraft = calls.updateDraft?.aggregated_draft_jsonb as Record<string, unknown>;
    expect(mergedDraft.employabilityFlow).toMatchObject({
      selectedRouteContext: {
        selectedRouteId: 'route-operations-coordinator-logistics-mid',
        fitLabelSnapshot: 'exploratorio',
        guidanceSnapshot: 'Usa esta ruta como referencia inicial mientras reunes mas contexto.',
      },
    });
  });

  it('rejects selection when there is no active recommendation shortlist', async () => {
    const { client } = createSupabaseMock({ withRecommendations: false });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await selectCareerRoute({
      userId: 'user-1',
      recommendationSetId: 'recset-snapshot-1-20260324010101',
      selectedRouteId: 'route-operations-coordinator-logistics-mid',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.message).toContain('No active recommendation shortlist');
  });
});
