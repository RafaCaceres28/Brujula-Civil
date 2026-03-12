import { createClient } from '@/lib/supabase/server';
import type { UserWizardStateRow } from '@/types/database.types';
import { describe, expect, it, vi } from 'vitest';
import { getOnboardingState } from './get-onboarding-state';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

function createSupabaseMock(result: {
  data: UserWizardStateRow | null;
  error: { message: string } | null;
}) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ eq }),
  });

  return { client: { from }, from, eq };
}

describe('getOnboardingState', () => {
  it('returns the wizard state row when found', async () => {
    const row = {
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
    } as UserWizardStateRow;

    const { client, from, eq } = createSupabaseMock({ data: row, error: null });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await getOnboardingState('user-1');

    expect(from).toHaveBeenCalledWith('user_wizard_state');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(result).toEqual(row);
  });

  it('throws a descriptive error when Supabase returns an error', async () => {
    const { client } = createSupabaseMock({
      data: null,
      error: { message: 'db is down' },
    });
    vi.mocked(createClient).mockResolvedValue(client as never);

    await expect(getOnboardingState('user-1')).rejects.toThrow(
      'Error loading onboarding state: db is down',
    );
  });
});
