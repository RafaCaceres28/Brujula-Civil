import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';

export default function OnboardingPage() {
  return (
    <PageShell>
      <SectionHeader
        title="Onboarding"
        description="Wizard guiado para recoger la información base del perfil."
      />
    </PageShell>
  );
}
