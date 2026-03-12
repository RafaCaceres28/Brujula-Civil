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
                      aggregated_draft_jsonb: onboardingDraftSchema.parse({
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
      rank: { code: 'captain', label: 'Capitan' },
      specialty: { code: 'communications', label: 'Comunicaciones' },
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

    expect(recalculateOnboardingState).toHaveBeenCalledWith('user-1');
  });
});
