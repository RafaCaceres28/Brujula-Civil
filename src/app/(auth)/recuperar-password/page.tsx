import { RecoverPasswordForm } from '@/features/auth/components/recover-password-form';

type RecoverPasswordPageProps = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function RecoverPasswordPage({ searchParams }: RecoverPasswordPageProps) {
  const params = await searchParams;
  const isConfirmMode = params.mode === 'confirm';

  return (
    <main className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Recuperar contrasena</h1>
        <p className="text-sm text-slate-600">
          {isConfirmMode
            ? 'Define una nueva contrasena para recuperar tu acceso.'
            : 'Te enviaremos instrucciones para restablecer tu acceso.'}
        </p>
      </div>

      <RecoverPasswordForm />
    </main>
  );
}
