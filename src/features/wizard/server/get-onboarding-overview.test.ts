import { createClient } from '@/lib/supabase/server';
import type { UserWizardStateRow, WizardStepStateRow } from '@/types/database.types';
import { describe, expect, it, vi } from 'vitest';
import { getOnboardingOverview } from './get-onboarding-overview';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

type OverviewMockParams = {
  stateResult: { data: UserWizardStateRow | null; error: { message: string } | null };
  stepsResult: { data: WizardStepStateRow[] | null; error: { message: string } | null };
};

function createSupabaseMock({ stateResult, stepsResult }: OverviewMockParams) {
  const stateMaybeSingle = vi.fn().mockResolvedValue(stateResult);
  const stateEq = vi.fn().mockReturnValue({ maybeSingle: stateMaybeSingle });

  const stepsOrder = vi.fn().mockResolvedValue(stepsResult);
  const stepsEq = vi.fn().mockReturnValue({ order: stepsOrder });

  const from = vi.fn((table: string) => {
    if (table === 'user_wizard_state') {
      return {
        select: vi.fn().mockReturnValue({ eq: stateEq }),
      };
    }

    if (table === 'wizard_step_states') {
      return {
        select: vi.fn().mockReturnValue({ eq: stepsEq }),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return { client: { from }, from, stateEq, stepsEq, stepsOrder };
}

describe('getOnboardingOverview', () => {
  it('returns state, ordered steps, completed keys, and parsed draft', async () => {
    const state = {
      user_id: 'user-1',
      current_step: 'missions_achievements',
      last_completed_step: 'military_background',
      completion_percent: 20,
      is_completed: false,
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
                reasonSummary: 'Se recomienda por coincidencias operativas y logisticas.',
                matchedSignals: ['TARGET_ROLE_HINT'],
              },
              {
                routeId: 'route-project-manager-consulting-mid',
                roleId: 'project-manager',
                sectorId: 'consulting',
                seniorityId: 'mid',
                reasonSummary: 'Se recomienda por coincidencias de planificacion y liderazgo.',
                matchedSignals: ['TARGET_SECTOR_HINT'],
              },
              {
                routeId: 'route-team-lead-technology-mid',
                roleId: 'team-lead',
                sectorId: 'technology',
                seniorityId: 'mid',
                reasonSummary: 'Se recomienda por experiencia de coordinacion de equipos.',
                matchedSignals: ['LEADERSHIP_MATCH'],
              },
            ],
          },
          selectedRecommendation: {
            recommendationSetId: 'recset-snapshot-1-20260324010101',
            selectedRouteId: 'route-operations-coordinator-logistics-mid',
            selectedAt: '2026-03-24T01:02:03.000Z',
          },
        },
      },
      started_at: '2026-01-01T00:00:00.000Z',
      last_saved_at: '2026-01-01T00:00:00.000Z',
      completed_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    } as UserWizardStateRow;

    const steps = [
      {
        id: 'step-1',
        user_id: 'user-1',
        step_key: 'military_background',
        step_order: 1,
        is_completed: true,
        payload_jsonb: {},
        saved_at: '2026-01-01T00:00:00.000Z',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'step-2',
        user_id: 'user-1',
        step_key: 'missions_achievements',
        step_order: 2,
        is_completed: false,
        payload_jsonb: {},
        saved_at: '2026-01-01T00:00:00.000Z',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ] as WizardStepStateRow[];

    const { client, from, stateEq, stepsEq, stepsOrder } = createSupabaseMock({
      stateResult: { data: state, error: null },
      stepsResult: { data: steps, error: null },
    });

    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await getOnboardingOverview('user-1');

    expect(from).toHaveBeenCalledWith('user_wizard_state');
    expect(from).toHaveBeenCalledWith('wizard_step_states');
    expect(stateEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(stepsEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(stepsOrder).toHaveBeenCalledWith('step_order', { ascending: true });
    expect(result.state).toEqual(state);
    expect(result.steps).toEqual(steps);
    expect(result.completedStepKeys).toEqual(['military_background']);
    expect(result.draft.militar.branch).toBeNull();
    expect(result.employabilityFlow?.recommendations?.recommendationSetId).toBe(
      'recset-snapshot-1-20260324010101',
    );
    expect(result.employabilityFlow?.selectedRoute?.selectedRouteId).toBe(
      'route-operations-coordinator-logistics-mid',
    );
  });

  it('throws a descriptive error when state query fails', async () => {
    const { client } = createSupabaseMock({
      stateResult: { data: null, error: { message: 'state exploded' } },
      stepsResult: { data: [], error: null },
    });

    vi.mocked(createClient).mockResolvedValue(client as never);

    await expect(getOnboardingOverview('user-1')).rejects.toThrow(
      'Error loading user_wizard_state: state exploded',
    );
  });

  it('throws a descriptive error when step query fails', async () => {
    const { client } = createSupabaseMock({
      stateResult: { data: null, error: null },
      stepsResult: { data: null, error: { message: 'steps exploded' } },
    });

    vi.mocked(createClient).mockResolvedValue(client as never);

    await expect(getOnboardingOverview('user-1')).rejects.toThrow(
      'Error loading wizard_step_states: steps exploded',
    );
  });

  it('maps legacy selectedRecommendation into selectedRoute on re-entry', async () => {
    const state = {
      user_id: 'user-1',
      current_step: 'missions_achievements',
      last_completed_step: 'review',
      completion_percent: 100,
      is_completed: true,
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
                reasonSummary: 'Se recomienda por coincidencias operativas y logisticas.',
                matchedSignals: ['TARGET_ROLE_HINT'],
              },
              {
                routeId: 'route-project-manager-consulting-mid',
                roleId: 'project-manager',
                sectorId: 'consulting',
                seniorityId: 'mid',
                reasonSummary: 'Se recomienda por coincidencias de planificacion y liderazgo.',
                matchedSignals: ['TARGET_SECTOR_HINT'],
              },
              {
                routeId: 'route-team-lead-technology-mid',
                roleId: 'team-lead',
                sectorId: 'technology',
                seniorityId: 'mid',
                reasonSummary: 'Se recomienda por experiencia de coordinacion de equipos.',
                matchedSignals: ['LEADERSHIP_MATCH'],
              },
            ],
          },
          selectedRecommendation: {
            recommendationSetId: 'recset-snapshot-1-20260324010101',
            selectedRouteId: 'route-project-manager-consulting-mid',
            selectedAt: '2026-03-24T01:02:03.000Z',
          },
        },
      },
      started_at: '2026-01-01T00:00:00.000Z',
      last_saved_at: '2026-01-01T00:00:00.000Z',
      completed_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    } as UserWizardStateRow;

    const { client } = createSupabaseMock({
      stateResult: { data: state, error: null },
      stepsResult: { data: [], error: null },
    });

    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await getOnboardingOverview('user-1');

    expect(result.employabilityFlow?.selectedRoute?.selectedRouteId).toBe(
      'route-project-manager-consulting-mid',
    );
    expect(result.employabilityFlow?.selectedRecommendation?.selectedRouteId).toBe(
      'route-project-manager-consulting-mid',
    );
  });
});
