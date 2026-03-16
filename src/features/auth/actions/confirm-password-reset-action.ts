'use server';

import { confirmPasswordResetSchema } from '../schemas/auth.schema';
import { mapSupabaseAuthError } from '../server/auth-error-mapper';
import type { AuthFieldErrors, RecoveryActionResult } from '../types/auth.types';
import { createClient } from '@/lib/supabase/server';
import type { ZodError } from 'zod';

function extractFieldErrors(error: ZodError | undefined): AuthFieldErrors | undefined {
  if (!error) {
    return undefined;
  }

  return error.flatten().fieldErrors as AuthFieldErrors;
}

export async function confirmPasswordResetAction(
  formData: FormData,
): Promise<RecoveryActionResult> {
  const parsed = confirmPasswordResetSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
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
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      const mappedError = mapSupabaseAuthError('confirm-reset', error.message);
      return {
        ok: false,
        code: mappedError.code,
        message: mappedError.message,
      };
    }

    return {
      ok: true,
      message: 'Contrasena actualizada. Ya puedes iniciar sesion.',
    };
  } catch {
    const mappedError = mapSupabaseAuthError('confirm-reset', undefined);
    return {
      ok: false,
      code: mappedError.code,
      message: mappedError.message,
    };
  }
}
