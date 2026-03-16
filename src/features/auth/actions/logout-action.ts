'use server';

import type { AuthActionResult } from '../types/auth.types';
import { mapSupabaseAuthError } from '../server/auth-error-mapper';
import { routes } from '../../../lib/constants/routes';
import { createClient } from '@/lib/supabase/server';

export async function logoutAction(): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      const mappedError = mapSupabaseAuthError('logout', error.message);
      return {
        ok: false,
        code: mappedError.code,
        message: mappedError.message,
      };
    }

    return {
      ok: true,
      redirectTo: routes.auth.login,
      message: 'Sesion cerrada.',
    };
  } catch {
    const mappedError = mapSupabaseAuthError('logout', undefined);
    return {
      ok: false,
      code: mappedError.code,
      message: mappedError.message,
    };
  }
}
