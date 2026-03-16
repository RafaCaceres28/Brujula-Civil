export type AuthErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'RATE_LIMITED'
  | 'AUTH_CALLBACK_FAILED'
  | 'UNKNOWN_AUTH_ERROR';

export type AuthFieldErrors = {
  email?: string[];
  password?: string[];
  confirmPassword?: string[];
};

export type AuthActionResult =
  | {
      ok: true;
      redirectTo?: string;
      message?: string;
    }
  | {
      ok: false;
      code: AuthErrorCode;
      message: string;
      fieldErrors?: AuthFieldErrors;
    };

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  password: string;
};

export type RecoveryActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      code: AuthErrorCode;
      message: string;
      fieldErrors?: AuthFieldErrors;
    };
