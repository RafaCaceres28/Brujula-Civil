import { createClient } from '@/lib/supabase/server';
import { describe, expect, it, vi } from 'vitest';
import { confirmPasswordResetAction } from './confirm-password-reset-action';
import { loginAction } from './login-action';
import { logoutAction } from './logout-action';
import { requestPasswordResetAction } from './request-password-reset-action';
import { registerAction } from './register-action';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

function createAuthClientMock(options: {
  signInError?: { message: string } | null;
  signUpError?: { message: string } | null;
  signOutError?: { message: string } | null;
  resetError?: { message: string } | null;
  updateUserError?: { message: string } | null;
}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: options.signInError ?? null }),
      signUp: vi.fn().mockResolvedValue({ error: options.signUpError ?? null }),
      signOut: vi.fn().mockResolvedValue({ error: options.signOutError ?? null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: options.resetError ?? null }),
      updateUser: vi.fn().mockResolvedValue({ error: options.updateUserError ?? null }),
    },
  };
}

function createCredentialsFormData(email: string, password: string) {
  const formData = new FormData();
  formData.set('email', email);
  formData.set('password', password);
  return formData;
}

function createRecoveryRequestFormData(email: string) {
  const formData = new FormData();
  formData.set('email', email);
  return formData;
}

function createRecoveryConfirmFormData(password: string, confirmPassword: string) {
  const formData = new FormData();
  formData.set('password', password);
  formData.set('confirmPassword', confirmPassword);
  return formData;
}

describe('auth actions contracts', () => {
  it('returns validation error for invalid login payload', async () => {
    const result = await loginAction(createCredentialsFormData('invalid-email', '123'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.fieldErrors?.email).toBeDefined();
    }
  });

  it('returns auth error when login provider rejects credentials', async () => {
    const client = createAuthClientMock({ signInError: { message: 'Invalid login credentials' } });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await loginAction(createCredentialsFormData('test@example.com', '12345678'));

    expect(result).toEqual({
      ok: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Email o contrasena invalidos.',
    });
  });

  it('returns success contract when login succeeds', async () => {
    const client = createAuthClientMock({});
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await loginAction(createCredentialsFormData('test@example.com', '12345678'));

    expect(result).toEqual({
      ok: true,
      redirectTo: '/dashboard',
    });
  });

  it('returns validation error for invalid register payload', async () => {
    const result = await registerAction(createCredentialsFormData('bad-email', '123'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.fieldErrors?.password).toBeDefined();
    }
  });

  it('returns auth error when register fails', async () => {
    const client = createAuthClientMock({ signUpError: { message: 'User already registered' } });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await registerAction(createCredentialsFormData('test@example.com', '12345678'));

    expect(result).toEqual({
      ok: false,
      code: 'EMAIL_ALREADY_REGISTERED',
      message: 'Este email ya esta registrado.',
    });
  });

  it('returns success contract when register succeeds', async () => {
    const client = createAuthClientMock({});
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await registerAction(createCredentialsFormData('test@example.com', '12345678'));

    expect(result).toEqual({
      ok: true,
      message: 'Cuenta creada. Revisa tu email si se requiere confirmacion.',
    });
  });

  it('returns success contract when logout succeeds', async () => {
    const client = createAuthClientMock({});
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await logoutAction();

    expect(result).toEqual({
      ok: true,
      redirectTo: '/login',
      message: 'Sesion cerrada.',
    });
  });

  it('returns auth error when logout fails', async () => {
    const client = createAuthClientMock({ signOutError: { message: 'failed sign out' } });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await logoutAction();

    expect(result).toEqual({
      ok: false,
      code: 'UNKNOWN_AUTH_ERROR',
      message: 'No se pudo cerrar sesion. Intenta nuevamente.',
    });
  });

  it('returns neutral success contract for password recovery request', async () => {
    const client = createAuthClientMock({});
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await requestPasswordResetAction(
      createRecoveryRequestFormData('test@example.com'),
    );

    expect(result).toEqual({
      ok: true,
      message: 'Si el email existe, te enviamos instrucciones para recuperar tu cuenta.',
    });
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledTimes(1);
  });

  it('returns validation error when recovery confirmation passwords mismatch', async () => {
    const result = await confirmPasswordResetAction(
      createRecoveryConfirmFormData('12345678', '12345679'),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.fieldErrors?.confirmPassword).toBeDefined();
    }
  });

  it('returns mapped error when password update fails', async () => {
    const client = createAuthClientMock({ updateUserError: { message: 'rate limit exceeded' } });
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await confirmPasswordResetAction(
      createRecoveryConfirmFormData('12345678', '12345678'),
    );

    expect(result).toEqual({
      ok: false,
      code: 'RATE_LIMITED',
      message: 'Demasiados intentos. Intenta nuevamente en unos minutos.',
    });
  });

  it('returns success contract when password update succeeds', async () => {
    const client = createAuthClientMock({});
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await confirmPasswordResetAction(
      createRecoveryConfirmFormData('12345678', '12345678'),
    );

    expect(result).toEqual({
      ok: true,
      message: 'Contrasena actualizada. Ya puedes iniciar sesion.',
    });
    expect(client.auth.updateUser).toHaveBeenCalledTimes(1);
  });
});
