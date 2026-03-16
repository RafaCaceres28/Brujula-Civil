'use server';

import { requestPasswordResetSchema } from '../schemas/auth.schema';
import { mapSupabaseAuthError } from '../server/auth-error-mapper';
import type { AuthFieldErrors, RecoveryActionResult } from '../types/auth.types';
import { routes } from '../../../lib/constants/routes';
import { createClient } from '@/lib/supabase/server';
import type { ZodError } from 'zod';

function extractFieldErrors(error: ZodError | undefined): AuthFieldErrors | undefined {
  if (!error) {
    return undefined;
  }

  return error.flatten().fieldErrors as AuthFieldErrors;
}

function getAppOrigin(): string {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.SITE_URL ??
    process.env.VERCEL_URL;

  if (!configuredOrigin) {
    return 'http://localhost:3000';
  }

  if (configuredOrigin.startsWith('http://') || configuredOrigin.startsWith('https://')) {
    return configuredOrigin;
  }

  return `https://${configuredOrigin}`;
}

export async function requestPasswordResetAction(
  formData: FormData,
): Promise<RecoveryActionResult> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get('email'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'Revisa los campos del formulario.',
      fieldErrors: extractFieldErrors(parsed.error),
    };
  }

  const callbackUrl = new URL(routes.auth.callback, getAppOrigin());
  callbackUrl.searchParams.set('next', `${routes.auth.forgotPassword}?mode=confirm`);

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: callbackUrl.toString(),
    });

    if (error) {
      const mappedError = mapSupabaseAuthError('request-reset', error.message);
      return {
        ok: false,
        code: mappedError.code,
        message: mappedError.message,
      };
    }

    return {
      ok: true,
      message: 'Si el email existe, te enviamos instrucciones para recuperar tu cuenta.',
    };
  } catch {
    const mappedError = mapSupabaseAuthError('request-reset', undefined);
    return {
      ok: false,
      code: mappedError.code,
      message: mappedError.message,
    };
  }
}
