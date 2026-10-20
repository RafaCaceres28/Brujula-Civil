import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WIZARD_STEPS } from '../config/wizard-steps';
import { saveExperienciaStepAction } from './save-experiencia-step-action';

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  profile: vi.fn(),
  overview: vi.fn(),
  save: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('@/features/auth/server/require-user', () => ({ requireUser: mocks.user }));
vi.mock('@/features/profile/server/get-profile', () => ({ getProfile: mocks.profile }));
vi.mock('../server/get-onboarding-overview', () => ({ getOnboardingOverview: mocks.overview }));
vi.mock('../server/save-onboarding-step', () => ({ saveOnboardingStep: mocks.save }));
vi.mock('next/navigation', () => ({
  unstable_rethrow: (error: { digest?: string }) => {
    if (error.digest) throw error;
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: 'user-1' });
  mocks.profile.mockResolvedValue({});
  mocks.overview.mockResolvedValue({ state: { current_step: 'missions_achievements' }, steps: [] });
  mocks.save.mockResolvedValue({ currentStep: 'skills_tools', isCompleted: false });
});

describe('saveExperienciaStepAction', () => {
  it('marca solo al continuar, ignora funciones enviadas y distingue vaciado de omision', async () => {
    const data = new FormData();
    data.append('_experienceFields', 'tools');
    data.append('functionTypes', 'execution');
    data.append('achievements', 'Logro real');
    expect(await saveExperienciaStepAction(data)).toEqual({
      ok: true,
      data: { nextHref: '/onboarding/competencias' },
    });
    expect(mocks.save).toHaveBeenCalledWith(
      'user-1',
      'experiencia',
      expect.objectContaining({ tools: [], achievements: ['Logro real'] }),
      {
        markCompleted: true,
        experienceFields: ['achievements', 'tools'],
      },
    );
    expect(mocks.save.mock.calls[0][2].functionTypes).toEqual([]);
    expect(mocks.profile).toHaveBeenCalledWith('user-1');
    expect(mocks.revalidate).toHaveBeenCalledExactlyOnceWith('/onboarding', 'layout');
  });
  it('recupera el primer pendiente real en vez de forzar competencias', async () => {
    mocks.save.mockResolvedValue({ currentStep: 'military_background', isCompleted: false });
    expect(await saveExperienciaStepAction(new FormData())).toMatchObject({
      ok: true,
      data: { nextHref: '/onboarding/militar' },
    });
  });
  it('sale al perfil para completados sin reabrir competencias', async () => {
    mocks.overview.mockResolvedValue({
      state: { current_step: 'completed', is_completed: true },
      steps: WIZARD_STEPS.map((step) => ({ step_key: step.dbKey, is_completed: true })),
    });
    mocks.save.mockResolvedValue({ currentStep: 'completed', isCompleted: true });
    expect(await saveExperienciaStepAction(new FormData())).toEqual({
      ok: true,
      data: { nextHref: '/perfil' },
    });
  });
  it.each(['missing', 'corrupt', 'storage'])(
    'no escribe ni afirma exito tras fallo %s',
    async (kind) => {
      if (kind === 'missing') mocks.profile.mockResolvedValue(null);
      if (kind === 'corrupt') mocks.profile.mockRejectedValue(new Error('private provider'));
      if (kind === 'storage') mocks.save.mockRejectedValue(new Error('private provider'));
      const result = await saveExperienciaStepAction(new FormData());
      expect(result).toMatchObject({ ok: false });
      expect(JSON.stringify(result)).not.toContain('private provider');
      if (kind !== 'storage') expect(mocks.save).not.toHaveBeenCalled();
      expect(mocks.revalidate).not.toHaveBeenCalled();
    },
  );
  it('rechaza narrativas invalidas sin escribir y devuelve error de validacion seguro', async () => {
    const data = new FormData();
    data.set('additionalContext', 'x'.repeat(501));
    expect(await saveExperienciaStepAction(data)).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('no acepta funciones o metadata nuevas como campos editables del paso', async () => {
    const data = new FormData();
    data.append('_experienceFields', 'functionTypes');
    data.append('_experienceFields', 'metadata');
    data.append('functionTypes', 'analysis');
    data.append('metadata', '{"forged":true}');
    await saveExperienciaStepAction(data);
    expect(mocks.save).toHaveBeenCalledWith(
      'user-1',
      'experiencia',
      expect.not.objectContaining({ metadata: expect.anything() }),
      { markCompleted: true, experienceFields: [] },
    );
  });
  it('no reabre un completed inconsistente con los cinco flags', async () => {
    mocks.overview.mockResolvedValue({ state: { is_completed: true }, steps: [] });
    expect(await saveExperienciaStepAction(new FormData())).toMatchObject({ ok: false });
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('no consume el redirect de autenticacion como fallo de guardado', async () => {
    const signal = Object.assign(new Error('redirect'), {
      digest: 'NEXT_REDIRECT;replace;/login;307;',
    });
    mocks.user.mockRejectedValue(signal);
    await expect(saveExperienciaStepAction(new FormData())).rejects.toBe(signal);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
