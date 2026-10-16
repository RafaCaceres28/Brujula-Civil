import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readExperiencesAction } from './read-experiences-action';

const mocks = vi.hoisted(() => ({ user: vi.fn(), profile: vi.fn() }));
vi.mock('@/features/auth/server/get-current-user', () => ({ getCurrentUser: mocks.user }));
vi.mock('../server/get-profile', () => ({ getProfile: mocks.profile }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: 'user-one' });
});
describe('readExperiencesAction', () => {
  it('lee usando identidad autenticada y devuelve historial canónico', async () => {
    const experiences = [
      { id: 'experience-one', activity: 'analysis', context: 'Contexto', stageIds: ['stage-one'] },
    ];
    mocks.profile.mockResolvedValue({ careerHistory: { experiences } });
    expect(await readExperiencesAction()).toEqual({ ok: true, data: { experiences } });
    expect(mocks.profile).toHaveBeenCalledExactlyOnceWith('user-one');
  });
  it('historial ausente en perfil existente sí es vacío válido', async () => {
    mocks.profile.mockResolvedValue({});
    expect(await readExperiencesAction()).toEqual({ ok: true, data: { experiences: [] } });
  });
  it('no lee sin sesión', async () => {
    mocks.user.mockResolvedValue(null);
    expect(await readExperiencesAction()).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' },
    });
    expect(mocks.profile).not.toHaveBeenCalled();
  });
  it('si falla verificar la sesión devuelve error sin consultar persistencia', async () => {
    mocks.user.mockRejectedValue(new Error('cookie provider'));
    expect(await readExperiencesAction()).toMatchObject({
      ok: false,
      error: { code: 'EXTERNAL_DEPENDENCY_ERROR' },
    });
    expect(mocks.profile).not.toHaveBeenCalled();
  });
  it('perfil inexistente no es historial vacío', async () => {
    mocks.profile.mockResolvedValue(null);
    expect(await readExperiencesAction()).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
  });
  it('oculta errores internos y no devuelve vacío cuando falla la lectura', async () => {
    mocks.profile.mockRejectedValue(new Error('private provider detail'));
    const result = await readExperiencesAction();
    expect(result).toMatchObject({ ok: false, error: { code: 'EXTERNAL_DEPENDENCY_ERROR' } });
    expect(JSON.stringify(result)).not.toContain('private provider detail');
  });
});
