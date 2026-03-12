import { createClient } from '@/lib/supabase/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { recalculateOnboardingState } from './recalculate-onboarding-state';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

type StepState = {
  step_key: string;
  is_completed: boolean;
};

function createSupabaseMock(stepStates: StepState[]) {
  const updates: {
    wizardState?: Record<string, unknown>;
    profile?: Record<string, unknown>;
  } = {};

  const client = {
    from(table: string) {
      if (table === 'wizard_step_states') {
        return {
          select() {
            return {
              eq: async () => ({ data: stepStates, error: null }),
            };
          },
        };
      }

      if (table === 'user_wizard_state') {
        return {
          update(payload: Record<string, unknown>) {
            updates.wizardState = payload;
            return {
              eq: async () => ({ error: null }),
            };
          },
        };
      }

      if (table === 'app_user_profiles') {
        return {
          update(payload: Record<string, unknown>) {
            updates.profile = payload;
            return {
              eq: async () => ({ error: null }),
            };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  return { client, updates };
}

describe('recalculateOnboardingState', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes partial completion state deterministically', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T10:00:00.000Z'));

    const { client, updates } = createSupabaseMock([
      { step_key: 'military_background', is_completed: true },
      { step_key: 'missions_achievements', is_completed: true },
    ]);

    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await recalculateOnboardingState('user-1');

    expect(result).toEqual({
      currentStep: 'skills_tools',
      lastCompletedStep: 'missions_achievements',
      completionPercent: 40,
      isCompleted: false,
    });

    expect(updates.wizardState).toMatchObject({
      current_step: 'skills_tools',
      last_completed_step: 'missions_achievements',
      completion_percent: 40,
      is_completed: false,
      completed_at: null,
    });
    expect(updates.profile).toEqual({ onboarding_completed: false });
  });

  it('marks wizard completed when all steps are done', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T10:00:00.000Z'));

    const { client, updates } = createSupabaseMock([
      { step_key: 'military_background', is_completed: true },
      { step_key: 'missions_achievements', is_completed: true },
      { step_key: 'skills_tools', is_completed: true },
      { step_key: 'preferences', is_completed: true },
      { step_key: 'review', is_completed: true },
    ]);

    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await recalculateOnboardingState('user-1');

    expect(result).toEqual({
      currentStep: 'completed',
      lastCompletedStep: 'review',
      completionPercent: 100,
      isCompleted: true,
    });

    expect(updates.wizardState).toMatchObject({
      current_step: 'completed',
      last_completed_step: 'review',
      completion_percent: 100,
      is_completed: true,
      completed_at: '2026-01-10T10:00:00.000Z',
    });
    expect(updates.profile).toEqual({ onboarding_completed: true });
  });
});
