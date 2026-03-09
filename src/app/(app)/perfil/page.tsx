import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';

export default function ProfilePage() {
  return (
    <PageShell>
      <SectionHeader
        title="Perfil"
        description="Gestión de datos personales, experiencia militar y objetivo profesional."
      />
    </PageShell>
  );
}
