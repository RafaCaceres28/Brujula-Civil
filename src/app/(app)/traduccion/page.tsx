import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';
import { getRequiredUser } from '@/features/auth/server/get-required-user';
import { generateCv } from '@/features/cv/server/generate-cv';
import { mapTranslationOutputToCvInput } from '@/features/cv/services/cv.mapper';
import { mapProfileToTranslationSnapshot } from '@/features/profile/services/profile.mapper';
import { getProfile } from '@/features/profile/server/get-profile';
import { resolveRecommendationState } from '@/features/recommendations/server/resolve-recommendation-state';
import { selectCareerRouteAction } from '@/features/recommendations/actions/select-career-route-action';
import { CareerRouteShortlist } from '@/features/recommendations/components/career-route-shortlist';
import type {
  RecommendationOutput,
  SelectedRouteContext,
} from '@/features/recommendations/schemas/recommendation.schema';
import {
  classifyCareerRoutesError,
  isOnboardingStorageReadError,
} from '@/features/recommendations/services/career-routes-error';
import { TranslationPreview } from '@/features/translation/components/translation-preview';
import { ExperienceProposals } from '@/features/translation/components/experience-proposals';
import { buildExperienceProposals } from '@/features/translation/services/experience-proposals.builder';
import type { ExperienceProposal } from '@/features/translation/types/experience-proposal.types';
import { generateTranslation } from '@/features/translation/server/generate-translation';
import { getOnboardingOverview } from '@/features/wizard/server/get-onboarding-overview';
import { routes } from '@/lib/constants/routes';
import { isDomainError } from '@/lib/contracts';

const ROUTES_FEEDBACK = {
  insufficient_data:
    'Revisa tus experiencias y los datos complementarios del perfil para obtener rutas sugeridas. Las propuestas de tu historial siguen disponibles.',
  storage:
    'No pudimos cargar las rutas sugeridas. No pudimos leer los datos guardados del onboarding. Reintenta la lectura.',
  service:
    'No pudimos cargar las rutas sugeridas. El servicio no esta disponible temporalmente. Espera un momento y reintenta.',
  invalid_input:
    'Los datos enviados para las rutas no son validos. Revisa tus experiencias y los datos complementarios del perfil.',
  internal:
    'No pudimos cargar las rutas sugeridas por un problema interno o de integridad de datos. Si persiste, contacta con soporte.',
  unavailable:
    'Las rutas sugeridas no estan disponibles para tu contexto actual. Revisa tu perfil y tu sesion.',
} as const;

type TranslationPageContentProps = {
  state: 'loading' | 'empty' | 'error' | 'ready';
  retryHref?: string;
  profileSummary?: string | null;
  blocks?: Array<{ id: string; content: string }>;
  cvSections?: Array<{ id: string; title: string; content: string; sourceBlockIds: string[] }>;
  recommendations?: RecommendationOutput;
  selectedRouteId?: string;
  explainabilityStatus?: 'complete' | 'partial';
  reentrySelectedRouteContext?: {
    reasonSummary: string;
    fitLabel: string;
    guidance: string;
  };
  reentrySelectedRouteContextFallback?: boolean;
  error?: unknown;
  profileReadFailed?: boolean;
  proposalBuildFailed?: boolean;
  routesFailure?: keyof typeof ROUTES_FEEDBACK;
  legacyFailed?: boolean;
  legacyUnavailable?: boolean;
  experienceProposals?: ExperienceProposal[];
  hasExperiences?: boolean;
};

function TranslationPageContent(props: TranslationPageContentProps) {
  return (
    <PageShell>
      <SectionHeader
        title="Traduccion"
        description="Transformacion del perfil militar a lenguaje civil."
      />

      {props.profileReadFailed ? (
        <section className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <p role="alert">
            No pudimos leer tu perfil. Reintenta la lectura para generar propuestas.
          </p>
          <Link href={routes.app.translation}>Reintentar lectura</Link>
        </section>
      ) : null}

      {props.experienceProposals ? (
        <ExperienceProposals
          proposals={props.experienceProposals}
          hasExperiences={props.hasExperiences ?? false}
        />
      ) : null}

      {props.proposalBuildFailed ? (
        <section className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <p role="alert">
            No pudimos generar las propuestas desde tu historial. Intenta de nuevo.
          </p>
          <Link href={routes.app.translation}>Reintentar propuestas</Link>
        </section>
      ) : null}

      {props.routesFailure ? (
        <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p role={props.routesFailure === 'insufficient_data' ? 'status' : 'alert'}>
            {ROUTES_FEEDBACK[props.routesFailure]}
          </p>
          {props.routesFailure === 'insufficient_data' ||
          props.routesFailure === 'invalid_input' ? (
            <Link href={`${routes.app.onboarding}/experiencia`}>
              Revisar experiencias y datos del perfil
            </Link>
          ) : props.routesFailure === 'storage' || props.routesFailure === 'service' ? (
            <Link href={routes.app.translation}>Reintentar rutas</Link>
          ) : null}
        </section>
      ) : null}

      {!props.profileReadFailed ? (
        <section
          aria-label={
            props.state === 'ready' || props.legacyFailed || props.legacyUnavailable
              ? 'Vista previa textual anterior'
              : undefined
          }
          className="space-y-4"
        >
          {props.state === 'ready' || props.legacyFailed || props.legacyUnavailable ? (
            <h2 className="text-base font-semibold text-slate-900">
              Vista previa textual anterior
            </h2>
          ) : null}
          {props.state === 'ready' ? (
            <p className="text-sm text-slate-600">
              Vista provisional basada en el resumen del perfil. No incorpora las propuestas
              pendientes de revision de tu historial.
            </p>
          ) : null}
          {props.legacyUnavailable ? (
            <p role="status" className="text-sm text-slate-700">
              La vista previa anterior es provisional y no dispone de un resumen fuente del perfil.
              No mostramos contenido de ejemplo como experiencia profesional. Las propuestas de tu
              historial son independientes de esta vista previa.
            </p>
          ) : props.legacyFailed ? (
            <section className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <p role="alert">
                No pudimos generar la vista previa textual anterior. Revisa tu perfil o reintenta.
              </p>
              <Link href={routes.app.translation}>Reintentar vista previa anterior</Link>
            </section>
          ) : (
            <TranslationPreview
              state={props.state}
              retryHref={props.retryHref}
              profileSummary={props.profileSummary}
              blocks={props.blocks}
              cvSections={props.cvSections}
              explainabilityStatus={props.explainabilityStatus}
              reentrySelectedRouteId={props.selectedRouteId}
              reentrySelectedRouteContext={props.reentrySelectedRouteContext}
              reentrySelectedRouteContextFallback={props.reentrySelectedRouteContextFallback}
              error={props.error}
            />
          )}
        </section>
      ) : null}

      {props.recommendations ? (
        <CareerRouteShortlist
          recommendationSetId={props.recommendations.recommendationSetId}
          routes={props.recommendations.routes}
          selectedRouteId={props.selectedRouteId}
          onSelect={selectCareerRouteAction}
        />
      ) : null}

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
  let profile;
  try {
    profile = await getProfile(user.id);
  } catch (error) {
    unstable_rethrow(error);
    console.error('Translation page: profile read failed');
    return <TranslationPageContent state="error" profileReadFailed />;
  }

  if (!profile) {
    return <TranslationPageContent state="empty" retryHref={routes.app.profile} />;
  }

  const experiences = profile.careerHistory?.experiences ?? [];
  const props: TranslationPageContentProps = {
    state: 'error',
    retryHref: routes.app.translation,
    hasExperiences: experiences.length > 0,
  };
  try {
    props.experienceProposals = buildExperienceProposals(experiences);
  } catch (error) {
    unstable_rethrow(error);
    console.error('Translation page: experience proposal builder failed');
    props.proposalBuildFailed = true;
  }

  let selectedRouteId: string | undefined;
  let selectedRouteContext: SelectedRouteContext | undefined;
  try {
    const overview = await getOnboardingOverview(user.id);
    const result = await resolveRecommendationState({ userId: user.id, overview, profile });
    if (result.ok) {
      props.recommendations = result.data.recommendations;
      selectedRouteId = result.data.selectedRoute?.selectedRouteId;
      selectedRouteContext = result.data.selectedRouteContext;
    } else {
      props.routesFailure = classifyCareerRoutesError(result.error, result.meta);
      if (props.routesFailure === 'internal') {
        console.error('Translation page: career recommendations internal failure');
      }
    }
  } catch (error) {
    unstable_rethrow(error);
    if (isOnboardingStorageReadError(error)) {
      props.routesFailure = 'storage';
    } else if (isDomainError(error)) {
      props.routesFailure = classifyCareerRoutesError(error);
      if (props.routesFailure === 'internal')
        console.error('Translation page: route context integrity failure');
    } else {
      console.error('Translation page: route context read failed');
      props.routesFailure = 'internal';
    }
  }

  props.selectedRouteId = selectedRouteId;
  props.reentrySelectedRouteContext = selectedRouteContext
    ? {
        reasonSummary: selectedRouteContext.reasonSummarySnapshot,
        fitLabel: selectedRouteContext.fitLabelSnapshot,
        guidance: selectedRouteContext.guidanceSnapshot,
      }
    : undefined;
  props.reentrySelectedRouteContextFallback = Boolean(selectedRouteId && !selectedRouteContext);
  props.explainabilityStatus = props.recommendations?.routes.some(
    (route) =>
      !route.explanation ||
      route.explanation.explanationKeywords.length === 0 ||
      route.explanation.decisionGuidance.trim().length === 0,
  )
    ? 'partial'
    : 'complete';

  if (!profile.militaryBackground.summary?.trim()) {
    return <TranslationPageContent {...props} legacyUnavailable />;
  }

  try {
    const profileSnapshot = mapProfileToTranslationSnapshot(profile);
    const translationResult = await generateTranslation({
      userId: user.id,
      sourceProfile: profileSnapshot,
      sourceLanguage: 'es-ES',
      targetLanguage: 'en-US',
      tone: 'neutral',
      ...(selectedRouteId ? { selectedRouteId } : {}),
      ...(selectedRouteContext
        ? {
            selectedRouteContext: {
              reasonSummarySnapshot: selectedRouteContext.reasonSummarySnapshot,
              fitLabelSnapshot: selectedRouteContext.fitLabelSnapshot,
              guidanceSnapshot: selectedRouteContext.guidanceSnapshot,
            },
          }
        : {}),
    });
    if (!translationResult.ok) {
      if (translationResult.error.code === 'INTERNAL_ERROR') {
        console.error('Translation page: legacy translation internal failure');
      }
      return <TranslationPageContent {...props} legacyFailed />;
    }

    const cvInput = mapTranslationOutputToCvInput({
      userId: user.id,
      profileSnapshotId: profileSnapshot.snapshotId,
      translatedContent: translationResult.data,
      templateKey: 'single-column',
    });
    const cvPreviewResult = await generateCv(cvInput);
    if (!cvPreviewResult.ok) {
      if (cvPreviewResult.error.code === 'INTERNAL_ERROR') {
        console.error('Translation page: legacy CV preview internal failure');
      }
      return <TranslationPageContent {...props} legacyFailed />;
    }

    props.state = 'ready';
    props.profileSummary = profileSnapshot.summary;
    props.blocks = translationResult.data.blocks;
    props.cvSections = cvPreviewResult.data.sections;
  } catch (error) {
    unstable_rethrow(error);
    console.error('Translation page: legacy snapshot/translation/CV pipeline failed');
    props.legacyFailed = true;
  }

  return <TranslationPageContent {...props} />;
}
