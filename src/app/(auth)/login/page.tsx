import { LoginForm } from '@/features/auth/components/login-form';
import { routes } from '../../../lib/constants/routes';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Inicia sesion</h1>
        <p className="text-sm text-slate-600">
          Accede para continuar con tu panel de Brujula Civil.
        </p>
      </div>

      <LoginForm />

      <p className="text-sm text-slate-600">
        Olvidaste tu contrasena?{' '}
        <Link href={routes.auth.forgotPassword} className="font-medium text-slate-900 underline">
          Recuperar acceso
        </Link>
      </p>

      <p className="text-sm text-slate-600">
        Aun no tienes cuenta?{' '}
        <Link href={routes.auth.register} className="font-medium text-slate-900 underline">
          Crear cuenta
        </Link>
      </p>
    </main>
  );
}
