import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';
import { LocalExperienceForm } from '@/features/translation/components/local-experience-form';

export default function ProfessionalExperiencePage() {
  return (
    <PageShell>
      <SectionHeader
        title="Experiencia profesional"
        description="Revisa una actividad de tu trayectoria, sin guardar cambios en tu perfil ni en el onboarding."
      />
      <LocalExperienceForm />
    </PageShell>
  );
}
