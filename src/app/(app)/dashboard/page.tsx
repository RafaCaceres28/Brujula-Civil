import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';

export default function DashboardPage() {
  return (
    <PageShell>
      <SectionHeader
        title="Dashboard"
        description="Resumen general del progreso del usuario dentro de Brújula Civil."
      />
    </PageShell>
  );
}
