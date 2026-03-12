import type { UserWizardStateRow } from '@/types/database.types';
import { describe, expect, it, vi } from 'vitest';
import { resolveOnboardingEntry } from './resolve-onboarding-entry';
import { getOnboardingState } from './get-onboarding-state';

vi.mock('./get-onboarding-state', () => ({
  getOnboardingState: vi.fn(),
}));

function createState(overrides: Partial<UserWizardStateRow>): UserWizardStateRow {
  return {
    user_id: 'user-1',
    current_step: 'military_background',
    last_completed_step: null,
    completion_percent: 0,
    is_completed: false,
    aggregated_draft_jsonb: {},
    started_at: '2026-01-01T00:00:00.000Z',
    last_saved_at: '2026-01-01T00:00:00.000Z',
    completed_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('resolveOnboardingEntry', () => {
  it('returns the first onboarding route when state is missing', async () => {
    vi.mocked(getOnboardingState).mockResolvedValue(null);

    const result = await resolveOnboardingEntry('user-1');

    expect(result).toBe('/onboarding/militar');
  });

  it('returns route for the active current step', async () => {
    vi.mocked(getOnboardingState).mockResolvedValue(
      createState({
        current_step: 'missions_achievements',
      }),
    );

    const result = await resolveOnboardingEntry('user-1');

    expect(result).toBe('/onboarding/experiencia');
  });

  it('returns dashboard when onboarding is completed', async () => {
    vi.mocked(getOnboardingState).mockResolvedValue(
      createState({
        current_step: 'completed',
        is_completed: true,
        completed_at: '2026-01-01T00:00:00.000Z',
      }),
    );

    const result = await resolveOnboardingEntry('user-1');

    expect(result).toBe('/dashboard');
  });
});
