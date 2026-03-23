import Link from 'next/link';
import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';
import { getRequiredUser } from '@/features/auth/server/get-required-user';
import { generateCv } from '@/features/cv/server/generate-cv';
import { mapTranslationOutputToCvInput } from '@/features/cv/services/cv.mapper';
import { mapProfileToTranslationSnapshot } from '@/features/profile/services/profile.mapper';
import { getProfile } from '@/features/profile/server/get-profile';
import { TranslationPreview } from '@/features/translation/components/translation-preview';
import { generateTranslation } from '@/features/translation/server/generate-translation';
import { routes } from '@/lib/constants/routes';

type TranslationPageContentProps = {
  state: 'loading' | 'empty' | 'error' | 'ready';
  retryHref?: string;
  profileSummary?: string | null;
  blocks?: Array<{ id: string; content: string }>;
  cvSections?: Array<{ id: string; title: string; content: string; sourceBlockIds: string[] }>;
  profileSnapshotId?: string;
  previewCompleteness?: 'complete' | 'needs_review' | 'insufficient_data';
  error?: unknown;
};

export function TranslationPageContent(props: TranslationPageContentProps) {
  return (
    <PageShell>
      <SectionHeader
        title="Traduccion"
        description="Transformacion del perfil militar a lenguaje civil."
      />

      <TranslationPreview
        state={props.state}
        retryHref={props.retryHref}
        profileSummary={props.profileSummary}
        blocks={props.blocks}
        cvSections={props.cvSections}
        traceability={{
          profileSnapshotId: props.profileSnapshotId,
          previewCompleteness: props.previewCompleteness,
        }}
        error={props.error}
      />

      {props.state === 'ready' ? (
        <Link
          href={`${routes.app.cv}/preview`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Revisar preview editable
        </Link>
      ) : null}
    </PageShell>
  );
}

export default async function TranslationPage() {
  const user = await getRequiredUser(routes.app.translation);
  const profile = await getProfile(user.id);

  if (!profile) {
    return <TranslationPageContent state="empty" retryHref={routes.app.profile} />;
  }

  const profileSnapshot = mapProfileToTranslationSnapshot(profile);
  const translationResult = await generateTranslation({
    userId: user.id,
    sourceProfile: profileSnapshot,
    sourceLanguage: 'es-ES',
    targetLanguage: 'en-US',
    tone: 'neutral',
  });

  if (!translationResult.ok) {
    return (
      <TranslationPageContent
        state="error"
        retryHref={routes.app.translation}
        error={translationResult.error}
      />
    );
  }

  const cvInput = mapTranslationOutputToCvInput({
    userId: user.id,
    profileSnapshotId: profileSnapshot.snapshotId,
    translatedContent: translationResult.data,
    templateKey: 'single-column',
  });

  const cvPreviewResult = await generateCv(cvInput);
  if (!cvPreviewResult.ok) {
    return (
      <TranslationPageContent
        state="error"
        retryHref={routes.app.translation}
        error={cvPreviewResult.error}
      />
    );
  }

  return (
    <TranslationPageContent
      state="ready"
      retryHref={routes.app.translation}
      profileSummary={profileSnapshot.summary}
      blocks={translationResult.data.blocks}
      cvSections={cvPreviewResult.data.sections}
      profileSnapshotId={profileSnapshot.snapshotId}
      previewCompleteness={cvPreviewResult.data.completeness}
    />
  );
}
