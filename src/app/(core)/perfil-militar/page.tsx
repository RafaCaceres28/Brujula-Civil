import Link from 'next/link';
import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';
import { getRequiredUser } from '@/features/auth/server/get-required-user';
import { MilitaryBasicsForm } from '@/features/profile/components/military-basics-form';
import { readMilitaryBasics } from '@/features/profile/server/military-basics';

export default async function MilitaryProfilePage() {
  const user = await getRequiredUser('/perfil-militar');
  const result = await readMilitaryBasics(user.id);
  return (
    <PageShell>
      <SectionHeader
        title="Perfil militar"
        description="Revisa y guarda tus datos militares básicos. Puedes dejar campos sin indicar."
      />
      <nav aria-label="Continuar con tu trayectoria" className="flex flex-wrap gap-4">
        <Link href="/experiencia-profesional" prefetch={false}>
          Experiencia profesional
        </Link>
        <Link href="/traduccion" prefetch={false}>
          Traducción
        </Link>
      </nav>
      {result.ok ? (
        <MilitaryBasicsForm initial={result.data} />
      ) : (
        <p role="alert">{result.error.message}</p>
      )}
    </PageShell>
  );
}
