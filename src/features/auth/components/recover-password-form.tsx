'use client';

import { confirmPasswordResetAction } from '@/features/auth/actions/confirm-password-reset-action';
import { requestPasswordResetAction } from '@/features/auth/actions/request-password-reset-action';
import type { RecoveryActionResult } from '@/features/auth/types/auth.types';
import { useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

export function RecoverPasswordForm() {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RecoveryActionResult | null>(null);

  const isConfirmMode = searchParams.get('mode') === 'confirm';
  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const actionResult = isConfirmMode
        ? await confirmPasswordResetAction(formData)
        : await requestPasswordResetAction(formData);

      setResult(actionResult);
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {isConfirmMode ? (
        <>
          <div>
            <label className="block mb-1" htmlFor="new-password">
              Nueva contrasena
            </label>
            <input
              id="new-password"
              name="password"
              type="password"
              className="w-full rounded border px-3 py-2"
              placeholder="********"
              autoComplete="new-password"
            />
            {fieldErrors?.password?.[0] ? (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.password[0]}</p>
            ) : null}
          </div>

          <div>
            <label className="block mb-1" htmlFor="confirm-password">
              Confirmar contrasena
            </label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              className="w-full rounded border px-3 py-2"
              placeholder="********"
              autoComplete="new-password"
            />
            {fieldErrors?.confirmPassword?.[0] ? (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword[0]}</p>
            ) : null}
          </div>
        </>
      ) : (
        <div>
          <label className="block mb-1" htmlFor="recover-email">
            Email
          </label>
          <input
            id="recover-email"
            name="email"
            type="email"
            className="w-full rounded border px-3 py-2"
            placeholder="tu@email.com"
            autoComplete="email"
          />
          {fieldErrors?.email?.[0] ? (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.email[0]}</p>
          ) : null}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {isPending
          ? 'Procesando...'
          : isConfirmMode
            ? 'Actualizar contrasena'
            : 'Enviar instrucciones'}
      </button>

      {result ? (
        <p className={`text-sm ${result.ok ? 'text-green-700' : 'text-red-600'}`}>
          {result.message}
        </p>
      ) : null}
    </form>
  );
}
