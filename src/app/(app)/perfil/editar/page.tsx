import Link from 'next/link';
import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';
import { getCurrentUser } from '@/features/auth/server/get-current-user';
import { ProfileForm } from '@/features/profile/components/profile-form';
import { mapDomainToProfileFormInitialValues } from '@/features/profile/services/profile.mapper';
import { getProfile } from '@/features/profile/server/get-profile';
import { routes } from '../../../../lib/constants/routes';

export default async function PerfilEditarPage() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Perfil editar page requires authenticated user from (app)/layout guard.');
  }

  const profile = await getProfile(user.id);
  const initialValues = profile ? mapDomainToProfileFormInitialValues(profile) : undefined;

  return (
    <PageShell>
      <SectionHeader
        title="Editar perfil"
        description="Actualiza tus datos personales, experiencia militar y objetivo profesional."
      />

      <Link
        href={routes.app.profile}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        Volver a perfil
      </Link>

      {!profile ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          Aun no encontramos un perfil guardado. Puedes completar el formulario y guardar tu
          informacion ahora.
        </div>
      ) : null}

      <ProfileForm userId={user.id} initialValues={initialValues} />
    </PageShell>
  );
}
