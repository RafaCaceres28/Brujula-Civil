import { createClient } from '@/lib/supabase/server';
import type { WizardStepStateRow } from '@/types/database.types';
import { describe, expect, it, vi } from 'vitest';
import { getOnboardingStep } from './get-onboarding-step';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

function createSupabaseMock(result: {
  data: WizardStepStateRow | null;
  error: { message: string } | null;
}) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn((column: string, value: string) => {
    if (column === 'user_id') {
      return { eq };
    }

    if (column === 'step_key') {
      return { maybeSingle };
    }

    throw new Error(`Unexpected filter ${column}=${value}`);
  });

  const from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ eq }),
  });

  return { client: { from }, from, eq };
}

describe('getOnboardingStep', () => {
  it('maps slug to db key and returns matching step row', async () => {
    const row = {
      id: 'step-2',
      user_id: 'user-1',
      step_key: 'missions_achievements',
      step_order: 2,
      is_completed: true,
      payload_jsonb: {},
      saved_at: '2026-01-01T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    } as WizardStepStateRow;

    const { client, from, eq } = createSupabaseMock({ data: row, error: null });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await getOnboardingStep('user-1', 'experiencia');

    expect(from).toHaveBeenCalledWith('wizard_step_states');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(eq).toHaveBeenCalledWith('step_key', 'missions_achievements');
    expect(result).toEqual(row);
  });

  it('includes the step slug when throwing query errors', async () => {
    const { client } = createSupabaseMock({
      data: null,
      error: { message: 'permission denied' },
    });
    vi.mocked(createClient).mockResolvedValue(client as never);

    await expect(getOnboardingStep('user-1', 'objetivos')).rejects.toThrow(
      'Error loading onboarding step "objetivos": permission denied',
    );
  });
});
