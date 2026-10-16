import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';
import { getRequiredUser } from '@/features/auth/server/get-required-user';
import { getProfile } from '@/features/profile/server/get-profile';
import { ProfessionalExperienceEditor } from '@/features/translation/components/professional-experience-editor';
import type { StructuredExperience } from '@/features/translation/schemas/structured-experience.schema';

export default async function ProfessionalExperiencePage() {
  const user = await getRequiredUser();
  let experiences: StructuredExperience[] = [];
  let error: string | undefined;
  try {
    const profile = await getProfile(user.id);
    if (!profile) error = 'No se pudo encontrar tu perfil. Reintenta la lectura.';
    else experiences = profile.careerHistory?.experiences ?? [];
  } catch {
    error = 'No se pudo cargar el historial. Reintenta la lectura antes de editar.';
  }
  return (
    <PageShell>
      <SectionHeader
        title="Experiencia profesional"
        description="Añade, revisa y guarda las actividades de tu trayectoria profesional."
      />
      <ProfessionalExperienceEditor initialExperiences={experiences} initialError={error} />
    </PageShell>
  );
}
