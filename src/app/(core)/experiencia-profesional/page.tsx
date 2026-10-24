import Link from 'next/link';
import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';
import { getRequiredUser } from '@/features/auth/server/get-required-user';
import { readCareerHistory } from '@/features/profile/server/read-career-history';
import { ProfessionalExperienceEditor } from '@/features/translation/components/professional-experience-editor';
import { routes } from '@/lib/constants/routes';

export default async function ProfessionalExperiencePage() {
  const user = await getRequiredUser();
  const result = await readCareerHistory(user.id);
  const experiences =
    result.ok && result.data.state === 'ready' ? result.data.careerHistory.experiences : [];
  const error = result.ok ? undefined : result.error.message;
  return (
    <PageShell>
      <SectionHeader
        title="Experiencia profesional"
        description="Añade, revisa y guarda las actividades de tu trayectoria profesional."
      />
      <Link href={routes.app.translation} prefetch={false}>
        Ver propuestas de traducción
      </Link>
      <ProfessionalExperienceEditor initialExperiences={experiences} initialError={error} />
    </PageShell>
  );
}
