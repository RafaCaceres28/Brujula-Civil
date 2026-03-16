import { RegisterForm } from '@/features/auth/components/register-form';

export default function RegisterPage() {
  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Crear cuenta</h1>
        <p className="text-sm text-slate-600">
          Empieza a construir tu transicion al mercado civil.
        </p>
      </div>

      <RegisterForm />
    </main>
  );
}
