import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';

export default function Loading() {
  return (
    <PageShell>
      <SectionHeader
        title="Editar perfil"
        description="Actualiza tus datos personales, experiencia militar y objetivo profesional."
      />
      <p role="status" aria-live="polite">
        Cargando editor de perfil...
      </p>
    </PageShell>
  );
}
