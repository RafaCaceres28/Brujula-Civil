'use server';

import { loginSchema } from '../schemas/auth.schema';
import type { AuthActionResult, AuthFieldErrors } from '../types/auth.types';
import { mapSupabaseAuthError } from '../server/auth-error-mapper';
import { routes } from '../../../lib/constants/routes';
import { createClient } from '@/lib/supabase/server';
import type { ZodError } from 'zod';

function extractFieldErrors(error: ZodError | undefined): AuthFieldErrors | undefined {
  if (!error) {
    return undefined;
  }

  return error.flatten().fieldErrors as AuthFieldErrors;
}

export async function loginAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'Revisa los campos del formulario.',
      fieldErrors: extractFieldErrors(parsed.error),
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      const mappedError = mapSupabaseAuthError('login', error.message);
      return {
        ok: false,
        code: mappedError.code,
        message: mappedError.message,
      };
    }

    return {
      ok: true,
      redirectTo: routes.app.dashboard,
    };
  } catch {
    const mappedError = mapSupabaseAuthError('login', undefined);
    return {
      ok: false,
      code: mappedError.code,
      message: mappedError.message,
    };
  }
}
