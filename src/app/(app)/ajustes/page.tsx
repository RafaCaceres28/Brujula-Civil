import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';

export default function SettingsPage() {
  return (
    <PageShell>
      <SectionHeader
        title="Ajustes"
        description="Configuración general de la cuenta y preferencias del usuario."
      />
    </PageShell>
  );
}
