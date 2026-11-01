import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/features/auth/server/get-current-user';
import { saveContactDetailsAction } from '../actions/save-contact-details-action';
import { saveContactDetailsSchema } from '../schemas/contact-details.schema';
import { readContactDetails, saveContactDetails } from './contact-details';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/features/auth/server/get-current-user', () => ({ getCurrentUser: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const blank = { display_name: null, phone: null, contact_email: null, locality_province: null };
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
  response = { data: [{ ...blank, phone: '+34 600 100 200' }], error: null };
  const query = {
    ...mocks,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(response).then(resolve),
  };
  for (const method of ['select', 'eq', 'is', 'update', 'insert', 'from'] as const)
    mocks[method].mockReturnValue(query);
  mocks.maybeSingle.mockResolvedValue({ data: blank, error: null });
  vi.mocked(createClient).mockResolvedValue({ from: mocks.from } as never);
  vi.mocked(getCurrentUser).mockResolvedValue({ id: 'owner' } as never);
});

describe('contact details boundary', () => {
  it('normalizes only submitted fields and supports explicit clears', () => {
    expect(
      saveContactDetailsSchema.parse({
        expected: blank,
        set: { display_name: ' Ana ', contact_email: '   ', phone: '', locality_province: null },
      }).set,
    ).toEqual({ display_name: 'Ana', contact_email: null, phone: null, locality_province: null });
  });
  it.each([
    { contact_email: 'not-an-email' },
    { phone: 'abc' },
    { phone: '+'.repeat(41) },
    { display_name: 'a'.repeat(201) },
    { locality_province: 'a'.repeat(161) },
    { userId: 'foreign' },
    { email: 'account@example.test' },
    { locale: 'en' },
  ])('rejects invalid or unrelated fields before storage: %j', async (set) => {
    expect(await saveContactDetails('owner', { expected: blank, set })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('rejects a client supplied identity at the outer boundary', async () => {
    expect(
      await saveContactDetailsAction({ userId: 'foreign', expected: blank, set: { phone: '123' } }),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('reads exactly four fields scoped to the owner without fallback or writes', async () => {
    expect(await readContactDetails('owner')).toEqual({ ok: true, data: blank });
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith('app_user_profiles');
    expect(mocks.select).toHaveBeenCalledExactlyOnceWith(
      'display_name, phone, contact_email, locality_province',
    );
    expect(mocks.eq).toHaveBeenCalledExactlyOnceWith('user_id', 'owner');
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('distinguishes absence, invalid stored data and read failures', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await readContactDetails('owner')).toEqual({ ok: true, data: null });
    mocks.maybeSingle.mockResolvedValueOnce({ data: {}, error: null });
    expect(await readContactDetails('owner')).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL_ERROR' },
    });
    mocks.maybeSingle.mockRejectedValueOnce(new Error('private contact data'));
    const result = await readContactDetails('owner');
    expect(result).toMatchObject({ ok: false, error: { code: 'EXTERNAL_DEPENDENCY_ERROR' } });
    expect(JSON.stringify(result)).not.toContain('private contact data');
  });
  it('patches only changed fields while comparing the complete null-aware baseline', async () => {
    const expected = {
      ...blank,
      display_name: 'Legacy '.repeat(40),
      contact_email: 'old@example.test',
    };
    await saveContactDetailsAction({ expected, set: { phone: ' +34 600 100 200 ' } });
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ phone: '+34 600 100 200' });
    expect(mocks.eq.mock.calls).toEqual([
      ['user_id', 'owner'],
      ['display_name', expected.display_name],
      ['contact_email', expected.contact_email],
    ]);
    expect(mocks.is.mock.calls).toEqual([
      ['phone', null],
      ['locality_province', null],
    ]);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('inserts a missing base without copying account email or bootstrapping other storage', async () => {
    await saveContactDetails('owner', { expected: null, set: { phone: '+34 600 100 200' } });
    expect(mocks.insert).toHaveBeenCalledExactlyOnceWith({
      user_id: 'owner',
      phone: '+34 600 100 200',
    });
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith('app_user_profiles');
  });
  it.each([
    { data: [], error: null },
    { data: null, error: { code: '23505' } },
  ])('reports conflicts for no affected row or competing insert', async (value) => {
    response = value;
    expect(
      await saveContactDetails('owner', { expected: null, set: { phone: '123' } }),
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
  });
  it('never reports a failed write as success or leaks provider errors', async () => {
    response = { data: null, error: { code: 'XX000', message: 'secret PII' } };
    const result = await saveContactDetails('owner', { expected: blank, set: { phone: '123' } });
    expect(result).toMatchObject({ ok: false, error: { code: 'EXTERNAL_DEPENDENCY_ERROR' } });
    expect(JSON.stringify(result)).not.toContain('secret PII');
  });
  it('does not rewrite an unchanged display_name', async () => {
    await saveContactDetails('owner', {
      expected: { ...blank, display_name: 'Ana' },
      set: { display_name: 'Ana', phone: '123' },
    });
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ phone: '123' });
  });
  it('requires authentication before accessing storage', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    expect(await saveContactDetailsAction({ expected: null, set: { phone: '123' } })).toMatchObject(
      { ok: false, error: { code: 'UNAUTHORIZED' } },
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('preserves Next control flow', async () => {
    const error = Object.assign(new Error('redirect'), {
      digest: 'NEXT_REDIRECT;replace;/login;307;',
    });
    vi.mocked(createClient).mockRejectedValueOnce(error);
    await expect(readContactDetails('owner')).rejects.toBe(error);
  });
});
