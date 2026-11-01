import Link from 'next/link';
import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';
import { getRequiredUser } from '@/features/auth/server/get-required-user';
import { ContactDetailsForm } from '@/features/profile/components/contact-details-form';
import { readContactDetails } from '@/features/profile/server/contact-details';
import { routes } from '@/lib/constants/routes';

export default async function ContactDetailsPage() {
  const user = await getRequiredUser(routes.app.contactDetails);
  const result = await readContactDetails(user.id);
  return (
    <PageShell>
      <SectionHeader
        title="Datos de contacto"
        description="Elige los datos personales que quieres incluir en tu borrador de CV."
      />
      {result.ok ? (
        <ContactDetailsForm initial={result.data} />
      ) : (
        <p role="alert">{result.error.message}</p>
      )}
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href={routes.app.professionalProfile} prefetch={false}>
          Volver a mi perfil profesional
        </Link>
        <Link href={routes.app.cvDraft} prefetch={false}>
          Ver borrador de CV
        </Link>
      </div>
    </PageShell>
  );
}
