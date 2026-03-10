'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(`Error en registro: ${error.message}`);
      return;
    }

    setMessage('Usuario registrado. Si Supabase pide confirmación por email, revisa tu correo.');
    router.refresh();
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(`Error en login: ${error.message}`);
      return;
    }

    setMessage('Login correcto');
    router.push('/test-storage');
    router.refresh();
  }

  async function handleSignOut() {
    setMessage('');

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(`Error al cerrar sesión: ${error.message}`);
      return;
    }

    setMessage('Sesión cerrada');
    router.refresh();
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Login Supabase</h1>

      <form className="space-y-4">
        <div>
          <label className="block mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <label className="block mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="********"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleSignUp}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            Registrarme
          </button>

          <button
            type="button"
            onClick={handleSignIn}
            className="rounded bg-black px-4 py-2 text-white"
          >
            Entrar
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="rounded bg-gray-600 px-4 py-2 text-white"
          >
            Salir
          </button>
        </div>
      </form>

      {message ? (
        <pre className="mt-4 whitespace-pre-wrap rounded border p-3">{message}</pre>
      ) : null}
    </main>
  );
}
