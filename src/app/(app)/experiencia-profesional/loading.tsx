import { PageShell } from '@/components/layout/page-shell';

export default function LoadingProfessionalExperience() {
  return (
    <PageShell>
      <p role="status" aria-live="polite" aria-busy="true">
        Cargando experiencia profesional…
      </p>
    </PageShell>
  );
}
