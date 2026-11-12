import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/features/auth/server/get-current-user';
import { saveAcademicEducationAction } from '../actions/save-academic-education-action';
import { readAcademicEducation, saveAcademicEducation } from './academic-education';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/features/auth/server/get-current-user', () => ({ getCurrentUser: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
const study = {
  id: 'study-1',
  title: 'Curso',
  institution: null,
  year: null,
  status: 'in_progress',
};
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  maybeSingle: vi.fn(),
}));
let response: { data: unknown; error: null | { code: string; message?: string } };
beforeEach(() => {
  vi.clearAllMocks();
  response = { data: [{ academic_education_jsonb: [study] }], error: null };
  const query = {
    ...mocks,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(response).then(resolve),
  };
  for (const method of ['from', 'select', 'eq', 'is', 'update', 'insert'] as const)
    mocks[method].mockReturnValue(query);
  mocks.maybeSingle.mockResolvedValue({
    data: { user_id: 'owner', academic_education_jsonb: null },
    error: null,
  });
  vi.mocked(createClient).mockResolvedValue({ from: mocks.from } as never);
  vi.mocked(getCurrentUser).mockResolvedValue({ id: 'owner' } as never);
});

describe('academic education read/write and action', () => {
  it('reads only the canonical base and never writes during reads', async () => {
    expect(await readAcademicEducation('owner')).toEqual({ ok: true, data: null });
    expect(mocks.select).toHaveBeenCalledExactlyOnceWith('user_id, academic_education_jsonb');
    expect(mocks.eq).toHaveBeenCalledExactlyOnceWith('user_id', 'owner');
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith('app_user_profiles');
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('distinguishes missing, explicit empty, corrupt and unavailable data', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await readAcademicEducation('owner')).toEqual({ ok: true, data: null });
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { academic_education_jsonb: [] },
      error: null,
    });
    expect(await readAcademicEducation('owner')).toEqual({ ok: true, data: [] });
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { academic_education_jsonb: [{}] },
      error: null,
    });
    expect(await readAcademicEducation('owner')).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
    mocks.maybeSingle.mockRejectedValueOnce(new Error('private detail'));
    const result = await readAcademicEducation('owner');
    expect(result).toMatchObject({ ok: false, error: { code: 'EXTERNAL_DEPENDENCY_ERROR' } });
    expect(JSON.stringify(result)).not.toContain('private detail');
  });
  it('updates only education with null-aware CAS and session identity', async () => {
    expect(
      await saveAcademicEducationAction({ expected: null, academicEducation: [study] }),
    ).toMatchObject({ ok: true });
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ academic_education_jsonb: [study] });
    expect(mocks.is).toHaveBeenCalledExactlyOnceWith('academic_education_jsonb', null);
    expect(mocks.eq.mock.calls).toEqual([
      ['user_id', 'owner'],
      ['user_id', 'owner'],
    ]);
  });
  it('compares canonical baseline but uses original raw JSON in atomic CAS', async () => {
    const raw = [{ ...study, title: ' Curso ' }];
    mocks.maybeSingle.mockResolvedValue({ data: { academic_education_jsonb: raw }, error: null });
    await saveAcademicEducation('owner', { expected: [study], academicEducation: [] });
    expect(mocks.eq).toHaveBeenLastCalledWith('academic_education_jsonb', JSON.stringify(raw));
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ academic_education_jsonb: [] });
  });
  it('inserts only a missing canonical base without identity metadata or bootstrap', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    await saveAcademicEducation('owner', { expected: null, academicEducation: [study] });
    expect(mocks.insert).toHaveBeenCalledExactlyOnceWith({
      user_id: 'owner',
      academic_education_jsonb: [study],
    });
    expect(mocks.from.mock.calls.every(([table]) => table === 'app_user_profiles')).toBe(true);
  });
  it('blocks stale baselines and corrupt stored data before writing', async () => {
    expect(
      await saveAcademicEducation('owner', { expected: [], academicEducation: [study] }),
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    mocks.maybeSingle.mockResolvedValue({
      data: { academic_education_jsonb: { unexpected: true } },
      error: null,
    });
    expect(
      await saveAcademicEducation('owner', { expected: null, academicEducation: [study] }),
    ).toMatchObject({ ok: false, error: { code: 'INTERNAL_ERROR' } });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it.each([
    { data: [], error: null },
    { data: null, error: { code: '23505' } },
  ])('requires exactly one affected row or reports a conflict', async (value) => {
    response = value;
    expect(
      await saveAcademicEducation('owner', { expected: null, academicEducation: [study] }),
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
  });
  it('sanitizes failed writes without false success', async () => {
    response = { data: null, error: { code: 'XX000', message: 'private detail' } };
    const result = await saveAcademicEducation('owner', {
      expected: null,
      academicEducation: [study],
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'EXTERNAL_DEPENDENCY_ERROR' } });
    expect(JSON.stringify(result)).not.toContain('private detail');
  });
  it('rejects client identity and invalid input before accessing storage', async () => {
    expect(
      await saveAcademicEducationAction({
        userId: 'foreign',
        expected: null,
        academicEducation: [study],
      }),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('requires a server session', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    expect(
      await saveAcademicEducationAction({ expected: null, academicEducation: [] }),
    ).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('preserves Next control flow', async () => {
    const error = Object.assign(new Error('redirect'), {
      digest: 'NEXT_REDIRECT;replace;/login;307;',
    });
    vi.mocked(createClient).mockRejectedValueOnce(error);
    await expect(readAcademicEducation('owner')).rejects.toBe(error);
  });
});
