import { beforeEach, expect, it, vi } from 'vitest';
import { getCurrentUser } from '@/features/auth/server/get-current-user';
import { saveExperience } from '../server/save-experience';
import { createExperienceAction, editExperienceAction } from './save-experience-action';

vi.mock('@/features/auth/server/get-current-user', () => ({ getCurrentUser: vi.fn() }));
vi.mock('../server/save-experience', () => ({ saveExperience: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

it('returns unauthenticated without storage', async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(null);
  expect(
    await createExperienceAction({ experience: { id: 'exp-1', activity: 'op_maintenance' } }),
  ).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
  expect(saveExperience).not.toHaveBeenCalled();
});

it.each([
  [createExperienceAction, { experience: { id: 'exp-1', activity: 'op_maintenance' } }, 'create'],
  [
    editExperienceAction,
    {
      id: 'exp-1',
      expectedExperience: { id: 'exp-1', activity: 'op_maintenance' },
      set: {},
      clear: ['autonomy'],
    },
    'edit',
  ],
] as const)(
  'uses authenticated identity and delegates the explicit operation',
  async (action, input, operation) => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'user-1' } as never);
    vi.mocked(saveExperience).mockResolvedValue({
      ok: true,
      data: { experience: { id: 'exp-1', activity: 'op_maintenance' } },
    });
    expect(await action(input)).toMatchObject({ ok: true });
    expect(saveExperience).toHaveBeenCalledWith('user-1', { ...input, operation });
  },
);

it.each([
  { userId: 'other', experience: { id: 'exp-1', activity: 'op_maintenance' } },
  { operation: 'edit', experience: { id: 'exp-1', activity: 'op_maintenance' } },
])('rejects identity/operation injection', async (input) => {
  expect(await createExperienceAction(input)).toMatchObject({
    error: { code: 'VALIDATION_ERROR' },
  });
  expect(saveExperience).not.toHaveBeenCalled();
});

it('does not misreport an auth provider failure as missing session', async () => {
  vi.mocked(getCurrentUser).mockRejectedValue(new Error('private auth details'));
  expect(
    await createExperienceAction({ experience: { id: 'exp-1', activity: 'op_maintenance' } }),
  ).toMatchObject({ error: { code: 'EXTERNAL_DEPENDENCY_ERROR' } });
});
