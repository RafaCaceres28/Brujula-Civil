import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';

export default function Loading() {
  return (
    <PageShell>
      <SectionHeader
        title="Perfil"
        description="Gestión de datos personales, experiencia militar y objetivo profesional."
      />
      <p role="status" aria-live="polite">
        Cargando perfil...
      </p>
    </PageShell>
  );
}
