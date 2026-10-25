import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';
import { getRequiredUser } from '@/features/auth/server/get-required-user';
import { readCareerHistory } from '@/features/profile/server/read-career-history';
import { ExperienceProposals } from '@/features/translation/components/experience-proposals';
import { buildExperienceProposals } from '@/features/translation/services/experience-proposals.builder';
import { routes } from '@/lib/constants/routes';
import { FUNCTION_TYPE_OPTIONS } from '@/features/wizard/config/wizard-catalogs';

export default async function TranslationPage() {
  const user = await getRequiredUser(routes.app.translation);
  const result = await readCareerHistory(user.id);
  let content;

  if (!result.ok) {
    content = (
      <p role="alert">
        {result.error.code === 'INTERNAL_ERROR'
          ? 'Hay un problema de integridad de tu historial. Revisa los datos guardados; si persiste, contacta con soporte.'
          : 'No pudimos leer tu historial. Reintenta la lectura para generar propuestas.'}
      </p>
    );
  } else if (result.data.state === 'missing_profile') {
    content = (
      <p role="status">
        No tienes un historial profesional guardado. Añade tu experiencia para fundamentar
        propuestas.
      </p>
    );
  } else {
    const experiences = result.data.state === 'ready' ? result.data.careerHistory.experiences : [];
    const pendingExperiences = experiences.filter((experience) => experience.otherTasks?.length);
    let proposals: ReturnType<typeof buildExperienceProposals> | undefined;
    try {
      proposals = buildExperienceProposals(experiences);
    } catch (error) {
      unstable_rethrow(error);
    }
    content = (
      <>
        {pendingExperiences.length ? (
          <section
            aria-labelledby="pending-tasks-title"
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2 id="pending-tasks-title" className="text-base font-semibold">
              Pendientes de interpretación
            </h2>
            <p className="text-sm text-slate-700">
              Tareas declaradas por ti, sin traducción automática. Estas tareas todavía no generan
              propuestas ni competencias y no se han incorporado a tu CV.
            </p>
            {pendingExperiences.map((experience) => (
              <article key={experience.id} className="space-y-3 border-t border-slate-200 pt-4">
                <h3 className="text-sm font-medium">
                  Experiencia {experiences.indexOf(experience) + 1}:{' '}
                  {experience.activity === 'reporting'
                    ? 'Elaboración de informes'
                    : FUNCTION_TYPE_OPTIONS.find((option) => option.value === experience.activity)
                        ?.label}
                </h3>
                {experience.otherTasks!.map((task, index) => (
                  <dl
                    key={index}
                    className="space-y-1 whitespace-pre-wrap break-words text-sm text-slate-700"
                  >
                    <dt className="font-medium">
                      Tu descripción, sin interpretar · Tarea {index + 1}
                    </dt>
                    <dd>{task.description}</dd>
                    <dt className="font-medium">Sobre qué trabajabas</dt>
                    <dd>{task.target}</dd>
                  </dl>
                ))}
              </article>
            ))}
          </section>
        ) : null}
        {proposals ? (
          proposals.length || !pendingExperiences.length ? (
            <ExperienceProposals proposals={proposals} hasExperiences={experiences.length > 0} />
          ) : null
        ) : (
          <p role="alert">
            No pudimos generar las propuestas desde tu historial. Intenta de nuevo.
          </p>
        )}
      </>
    );
  }

  return (
    <PageShell>
      <SectionHeader
        title="Traduccion"
        description="Propuestas civiles basadas en tu historial profesional, pendientes de revision."
      />
      {content}
      <div className="flex flex-wrap gap-4">
        <Link href="/experiencia-profesional" prefetch={false}>
          Revisar experiencia profesional
        </Link>
        <Link href={routes.app.translation} prefetch={false}>
          Reintentar propuestas
        </Link>
      </div>
    </PageShell>
  );
}
