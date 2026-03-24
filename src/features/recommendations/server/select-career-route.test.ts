import { createClient } from '@/lib/supabase/server';
import { describe, expect, it, vi } from 'vitest';
import { selectCareerRoute } from './select-career-route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

function createSupabaseMock() {
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
        selectedRouteId: 'route-operations-coordinator-logistics-mid',
      },
    });
  });

  it('rejects route that does not belong to recommendation set', async () => {
    const { client } = createSupabaseMock();
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
  });
});
