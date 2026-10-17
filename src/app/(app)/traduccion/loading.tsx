import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';
import { TranslationPreview } from '@/features/translation/components/translation-preview';

export default function TranslationLoadingPage() {
  return (
    <PageShell>
      <SectionHeader
        title="Traduccion"
        description="Transformacion del perfil militar a lenguaje civil."
      />
      <section className="space-y-4">
        <TranslationPreview state="loading" />
      </section>
    </PageShell>
  );
}
