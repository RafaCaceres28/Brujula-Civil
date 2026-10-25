import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';
import { getRequiredUser } from '@/features/auth/server/get-required-user';
import { readCareerHistory } from '@/features/profile/server/read-career-history';
import { selectConfirmedProfessionalContent } from '@/features/profile/services/confirmed-professional-content';
import { routes } from '@/lib/constants/routes';

export default async function ProfessionalProfilePage() {
  const user = await getRequiredUser(routes.app.professionalProfile);
  const result = await readCareerHistory(user.id);
  let content;

  if (!result.ok) {
    content = (
      <p role="alert">
        {result.error.code === 'INTERNAL_ERROR'
          ? 'Hay un problema de integridad de tu historial. Revisa los datos guardados; si persiste, contacta con soporte.'
          : 'No pudimos leer tu historial. Recarga la página para reintentar.'}
      </p>
    );
  } else {
    const experiences = result.data.state === 'ready' ? result.data.careerHistory.experiences : [];
    let confirmed: ReturnType<typeof selectConfirmedProfessionalContent> | undefined;
    try {
      confirmed = selectConfirmedProfessionalContent(experiences);
    } catch (error) {
      unstable_rethrow(error);
    }

    if (!confirmed) {
      content = (
        <p role="alert">
          No pudimos comprobar las competencias vigentes de tu historial. Recarga la página para
          reintentar.
        </p>
      );
    } else {
      const { descriptions, competencies } = confirmed;

      content = (
        <>
          {!descriptions.length && !competencies.length ? (
            <p role="status">
              Tu perfil profesional todavía no tiene contenido confirmado. Revisa tus descripciones
              y competencias en Traducción, o añade tu experiencia profesional.
            </p>
          ) : null}
          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <section
              aria-labelledby="professional-experience"
              className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h2 id="professional-experience" className="text-lg font-semibold">
                Experiencia profesional
              </h2>
              <p className="text-sm text-slate-600">
                {descriptions.length} descripciones confirmadas por ti
              </p>
              {descriptions.length ? (
                <ul className="space-y-4">
                  {descriptions.map(({ id, sourceId, origin, task, index }) => (
                    <li
                      key={id}
                      data-source-experience-id={sourceId}
                      className="space-y-2 border-t border-slate-200 pt-4"
                    >
                      <p className="text-sm font-medium text-slate-700">Confirmada por ti</p>
                      <p className="whitespace-pre-wrap break-words">{task.confirmedDescription}</p>
                      <p className="text-sm text-slate-600">
                        Origen: {origin} · Tarea {index + 1}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Todavía no has confirmado descripciones de tu experiencia profesional.</p>
              )}
            </section>
            <section
              aria-labelledby="professional-competencies"
              className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h2 id="professional-competencies" className="text-lg font-semibold">
                Competencias profesionales
              </h2>
              <p className="text-sm text-slate-600">{competencies.length} aceptaciones vigentes</p>
              {competencies.length ? (
                <ul className="space-y-4">
                  {competencies.map(({ candidate, origin }) => (
                    <li
                      key={candidate.id}
                      data-source-experience-id={candidate.experienceId}
                      className="space-y-2 border-t border-slate-200 pt-4"
                    >
                      <p className="text-sm font-medium text-slate-700">Aceptada por ti</p>
                      <p className="break-words">{candidate.label}</p>
                      <p className="text-sm text-slate-600">Origen: {origin}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Todavía no tienes competencias aceptadas con evidencia vigente.</p>
              )}
            </section>
          </div>
        </>
      );
    }
  }

  return (
    <PageShell>
      <SectionHeader
        title="Mi perfil profesional civil"
        description="Consulta las descripciones que has confirmado y las competencias que has aceptado con evidencia vigente."
      />
      <p className="text-sm font-medium text-slate-700">Solo lectura</p>
      <p className="text-sm text-slate-600">
        Información revisada por ti. No acredita titulaciones ni habilitaciones profesionales.
      </p>
      {content}
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href={routes.app.cvDraft} prefetch={false}>
          Ver borrador de CV
        </Link>
        <Link href={routes.app.translation} prefetch={false}>
          Revisar en Traducción
        </Link>
        <Link href="/experiencia-profesional" prefetch={false}>
          Gestionar experiencia profesional
        </Link>
      </div>
    </PageShell>
  );
}
