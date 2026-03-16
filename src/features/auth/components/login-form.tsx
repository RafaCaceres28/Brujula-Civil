'use client';

import { loginAction } from '@/features/auth/actions/login-action';
import type { AuthActionResult } from '@/features/auth/types/auth.types';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthActionResult | null>(null);

  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const actionResult = await loginAction(formData);
      setResult(actionResult);

      if (actionResult.ok && actionResult.redirectTo) {
        router.push(actionResult.redirectTo);
        router.refresh();
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div>
        <label className="block mb-1" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
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
        <label className="block mb-1" htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          className="w-full rounded border px-3 py-2"
          placeholder="********"
          autoComplete="current-password"
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
        {isPending ? 'Ingresando...' : 'Entrar'}
      </button>

      {result && !result.ok ? <p className="text-sm text-red-600">{result.message}</p> : null}
    </form>
  );
}
