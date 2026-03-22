// Devuelve el usuario autenticado actual o null.

import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

type AuthErrorLike = {
  status?: number;
  code?: string;
};

const EXPECTED_AUTH_ABSENCE_CODES = new Set([
  'session_not_found',
  'session_expired',
  'invalid_jwt',
  'bad_jwt',
]);

function isExpectedAuthAbsenceError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const authError = error as AuthErrorLike;

  if (authError.status === 401 || authError.status === 403) {
    return true;
  }

  if (typeof authError.code !== 'string') {
    return false;
  }

  return EXPECTED_AUTH_ABSENCE_CODES.has(authError.code.toLowerCase());
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (isExpectedAuthAbsenceError(error)) {
      return null;
    }

    throw error;
  }

  return user;
}
