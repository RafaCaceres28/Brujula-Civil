import type { AuthErrorCode } from '../types/auth.types';

type AuthOperation = 'login' | 'register' | 'logout' | 'request-reset' | 'confirm-reset';

type DomainError = {
  code: AuthErrorCode;
  message: string;
};

const RATE_LIMIT_ERROR: DomainError = {
  code: 'RATE_LIMITED',
  message: 'Demasiados intentos. Intenta nuevamente en unos minutos.',
};

function includesAny(target: string, values: string[]): boolean {
  return values.some((value) => target.includes(value));
}

export function mapSupabaseAuthError(
  operation: AuthOperation,
  providerMessage: string | undefined,
): DomainError {
  const normalized = (providerMessage ?? '').toLowerCase();

  if (includesAny(normalized, ['rate limit', 'too many requests', 'too many attempts', '429'])) {
    return RATE_LIMIT_ERROR;
  }

  if (operation === 'login') {
    if (includesAny(normalized, ['invalid login credentials', 'invalid credentials'])) {
      return {
        code: 'INVALID_CREDENTIALS',
        message: 'Email o contrasena invalidos.',
      };
    }

    return {
      code: 'UNKNOWN_AUTH_ERROR',
      message: 'No se pudo iniciar sesion. Intenta nuevamente.',
    };
  }

  if (operation === 'register') {
    if (includesAny(normalized, ['already registered', 'already been registered'])) {
      return {
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'Este email ya esta registrado.',
      };
    }

    return {
      code: 'UNKNOWN_AUTH_ERROR',
      message: 'No se pudo completar el registro. Intenta nuevamente.',
    };
  }

  if (operation === 'logout') {
    return {
      code: 'UNKNOWN_AUTH_ERROR',
      message: 'No se pudo cerrar sesion. Intenta nuevamente.',
    };
  }

  if (operation === 'request-reset') {
    return {
      code: 'UNKNOWN_AUTH_ERROR',
      message: 'No se pudo enviar el correo de recuperacion. Intenta nuevamente.',
    };
  }

  return {
    code: 'UNKNOWN_AUTH_ERROR',
    message: 'No se pudo actualizar la contrasena. Intenta nuevamente.',
  };
}
