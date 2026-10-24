import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';

export default function TranslationLoadingPage() {
  return (
    <PageShell>
      <SectionHeader
        title="Traduccion"
        description="Transformacion del perfil militar a lenguaje civil."
      />
      <p role="status">Estamos preparando las propuestas desde tu historial profesional.</p>
    </PageShell>
  );
}
