'use client';

import { registerAction } from '@/features/auth/actions/register-action';
import type { AuthActionResult } from '@/features/auth/types/auth.types';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthActionResult | null>(null);

  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const actionResult = await registerAction(formData);
      setResult(actionResult);

      if (actionResult.ok) {
        router.refresh();
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div>
        <label className="block mb-1" htmlFor="register-email">
          Email
        </label>
        <input
          id="register-email"
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

      <div>
        <label className="block mb-1" htmlFor="register-password">
          Password
        </label>
        <input
          id="register-password"
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

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>

      {result ? (
        <p className={`text-sm ${result.ok ? 'text-green-700' : 'text-red-600'}`}>
          {result.message}
        </p>
      ) : null}
    </form>
  );
}
