import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';
import { getRequiredUser } from '@/features/auth/server/get-required-user';
import { readCareerHistory } from '@/features/profile/server/read-career-history';
import { selectConfirmedProfessionalContent } from '@/features/profile/services/confirmed-professional-content';
import { routes } from '@/lib/constants/routes';

export default async function CvDraftPage() {
  const user = await getRequiredUser(routes.app.cvDraft);
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
    let confirmed: ReturnType<typeof selectConfirmedProfessionalContent> | undefined;
    try {
      confirmed = selectConfirmedProfessionalContent(
        result.data.state === 'ready' ? result.data.careerHistory.experiences : [],
      );
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
    } else if (!confirmed.descriptions.length && !confirmed.competencies.length) {
      content = (
        <p role="status">
          Tu borrador de CV todavía no tiene contenido confirmado. Revisa tus descripciones y
          competencias en tu perfil profesional.
        </p>
      );
    } else {
      const { descriptions, competencies } = confirmed;
      content = (
        <article
          aria-label="Contenido del borrador de CV"
          className="min-w-0 space-y-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8"
        >
          <section aria-labelledby="cv-experience" className="min-w-0 space-y-4">
            <h2 id="cv-experience" className="text-lg font-semibold">
              Experiencia profesional
            </h2>
            {descriptions.length ? (
              <ul className="space-y-4">
                {descriptions.map(({ id, sourceId, origin, task, index }) => (
                  <li key={id} data-source-experience-id={sourceId} className="space-y-2">
                    <p className="whitespace-pre-wrap break-words">{task.confirmedDescription}</p>
                    <p className="text-sm text-slate-600">
                      Confirmada por ti · Origen: {origin} · Tarea {index + 1}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Todavía no has confirmado descripciones de tu experiencia profesional.</p>
            )}
          </section>
          <section aria-labelledby="cv-competencies" className="min-w-0 space-y-4">
            <h2 id="cv-competencies" className="text-lg font-semibold">
              Competencias profesionales
            </h2>
            {competencies.length ? (
              <ul className="space-y-4">
                {competencies.map(({ candidate, origin }) => (
                  <li
                    key={candidate.id}
                    data-source-experience-id={candidate.experienceId}
                    className="space-y-2"
                  >
                    <p className="break-words">{candidate.label}</p>
                    <p className="text-sm text-slate-600">Aceptada por ti · Origen: {origin}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Todavía no tienes competencias aceptadas con evidencia vigente.</p>
            )}
          </section>
        </article>
      );
    }
  }

  return (
    <PageShell>
      <SectionHeader
        title="Borrador de CV"
        description="Vista previa de tus descripciones confirmadas y competencias aceptadas con evidencia vigente."
      />
      <p className="text-sm font-medium text-slate-700">Solo lectura</p>
      <p className="text-sm text-slate-600">
        Información revisada por ti. No acredita titulaciones ni habilitaciones profesionales.
      </p>
      <section
        aria-labelledby="cv-missing-data"
        className="min-w-0 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700"
      >
        <h2 id="cv-missing-data" className="font-semibold">
          Datos pendientes para completar el CV
        </h2>
        <p>
          Este borrador no incluye nombre, datos de contacto ni formación: no están disponibles en
          esta vista y faltan para completar el CV. No se consultan otras fuentes ni se inventan
          datos.
        </p>
        <p>
          La experiencia solo se muestra con descripciones confirmadas por ti. Si no has confirmado
          ninguna, esa parte del CV queda pendiente; no se inventa experiencia.
        </p>
      </section>
      {content}
      <Link href={routes.app.professionalProfile} prefetch={false}>
        Volver a mi perfil profesional
      </Link>
    </PageShell>
  );
}
