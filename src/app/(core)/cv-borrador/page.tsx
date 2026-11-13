import Link from 'next/link';
import { unstable_rethrow } from 'next/navigation';
import { PageShell } from '@/components/layout/page-shell';
import { SectionHeader } from '@/components/layout/section-header';
import { getRequiredUser } from '@/features/auth/server/get-required-user';
import { readCareerHistory } from '@/features/profile/server/read-career-history';
import { readContactDetails } from '@/features/profile/server/contact-details';
import { readAcademicEducation } from '@/features/profile/server/academic-education';
import { selectConfirmedProfessionalContent } from '@/features/profile/services/confirmed-professional-content';
import { FUNCTION_TYPE_OPTIONS } from '@/features/wizard/config/wizard-catalogs';
import { routes } from '@/lib/constants/routes';
import styles from './cv-draft.module.css';
import { PrintCvButton } from './print-cv-button';

const DURATION_LABELS = {
  less_than_1_year: 'Menos de un año',
  one_to_five_years: 'Entre 1 y 5 años',
  more_than_5_years: 'Más de 5 años',
};

export default async function CvDraftPage() {
  const user = await getRequiredUser(routes.app.cvDraft);
  const result = await readCareerHistory(user.id);
  const contactResult = await readContactDetails(user.id);
  const educationResult = await readAcademicEducation(user.id);
  const contact = contactResult.ok ? contactResult.data : null;
  let content;
  let confirmed: ReturnType<typeof selectConfirmedProfessionalContent> | undefined;

  if (!result.ok) {
    content = (
      <p role="alert">
        {result.error.code === 'INTERNAL_ERROR'
          ? 'Hay un problema de integridad de tu historial. Revisa los datos guardados; si persiste, contacta con soporte.'
          : 'No pudimos leer tu historial. Recarga la página para reintentar.'}
      </p>
    );
  } else {
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
        <div className={styles.reviewNotes}>
          {!descriptions.length && (
            <p>Todavía no has confirmado descripciones de tu experiencia profesional.</p>
          )}
          {!competencies.length && (
            <p>Todavía no tienes competencias aceptadas con evidencia vigente.</p>
          )}
          <details>
            <summary>Información revisada por ti</summary>
            <ul>
              {descriptions.map(({ id, origin, index }) => (
                <li key={id}>
                  Confirmada por ti · Origen: {origin} · Tarea {index + 1}
                </li>
              ))}
              {competencies.map(({ candidate, origin }) => (
                <li key={candidate.id}>Aceptada por ti · Origen: {origin}</li>
              ))}
            </ul>
          </details>
        </div>
      );
    }
  }

  const experienceGroups =
    result.ok && result.data.state === 'ready' && confirmed
      ? result.data.careerHistory.experiences.flatMap((experience) => {
          const descriptions = confirmed.descriptions.filter(
            ({ sourceId }) => sourceId === experience.id,
          );
          return descriptions.length ? [{ experience, descriptions }] : [];
        })
      : [];

  return (
    <PageShell className={styles.page}>
      <div className={styles.screenOnly}>
        <SectionHeader
          title="Borrador de CV"
          description="Vista previa de tus descripciones confirmadas y competencias aceptadas con evidencia vigente."
        />
        <p className="text-sm font-medium text-slate-700">Solo lectura</p>
        <p className="text-sm text-slate-600">
          Información revisada por ti. No acredita titulaciones ni habilitaciones profesionales.
        </p>
        <nav aria-label="Opciones del borrador de CV" className={styles.actions}>
          <Link href={routes.app.contactDetails} prefetch={false}>
            Editar datos de contacto
          </Link>
          <Link href={routes.app.academicEducation} prefetch={false}>
            {educationResult.ok && !educationResult.data?.length
              ? 'Registrar estudios'
              : 'Editar formación académica'}
          </Link>
          <Link href={routes.app.professionalProfile} prefetch={false}>
            Volver a mi perfil profesional
          </Link>
        </nav>
        <div>
          <PrintCvButton />
          <p className="mt-2 text-sm text-slate-600">
            En el diálogo de impresión, elige Guardar como PDF
          </p>
        </div>
      </div>
      <div className={styles.canvas}>
        {(Object.values(contact ?? {}).some((value) => value?.trim()) ||
          (educationResult.ok && !!educationResult.data?.length) ||
          !!confirmed?.descriptions.length ||
          !!confirmed?.competencies.length) && (
          <article aria-label="Contenido del borrador de CV" className={styles.document}>
            {Object.values(contact ?? {}).some((value) => value?.trim()) && (
              <header aria-label="Cabecera del borrador de CV" className={styles.documentHeader}>
                {contact?.display_name?.trim() && (
                  <h2 className={styles.name}>{contact.display_name}</h2>
                )}
                <address className={styles.contact}>
                  {contact?.phone?.trim() && <span>{contact.phone}</span>}
                  {contact?.contact_email?.trim() && <span>{contact.contact_email}</span>}
                  {contact?.locality_province?.trim() && <span>{contact.locality_province}</span>}
                </address>
              </header>
            )}
            {!!experienceGroups.length && (
              <section aria-labelledby="cv-experience" className={styles.section}>
                <h2 id="cv-experience" className={styles.sectionTitle}>
                  Experiencia profesional
                </h2>
                {experienceGroups.map(({ experience, descriptions }) => (
                  <div
                    key={experience.id}
                    data-source-experience-id={experience.id}
                    aria-labelledby={`cv-experience-${experience.id}`}
                    className={styles.experienceGroup}
                  >
                    <h3 id={`cv-experience-${experience.id}`} className={styles.experienceHeading}>
                      Actividad declarada:{' '}
                      {
                        FUNCTION_TYPE_OPTIONS.find(({ value }) => value === experience.activity)!
                          .label
                      }
                    </h3>
                    {experience.durationRange && experience.durationRange !== 'not_sure' && (
                      <p className={styles.experienceDuration}>
                        Periodo aproximado de actividad: {DURATION_LABELS[experience.durationRange]}
                        . No indica dedicación continua.
                      </p>
                    )}
                    <ul className={styles.entries}>
                      {descriptions.map(({ id, sourceId, task }) => (
                        <li key={id} data-source-experience-id={sourceId}>
                          <p>{task.confirmedDescription}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            )}
            {educationResult.ok && !!educationResult.data?.length && (
              <section aria-labelledby="cv-education" className={styles.section}>
                <h2 id="cv-education" className={styles.sectionTitle}>
                  Formación académica
                </h2>
                <ul className={styles.studies}>
                  {educationResult.data.map((study) => (
                    <li key={study.id}>
                      <h3>{study.title}</h3>
                      {study.institution && <p>{study.institution}</p>}
                      <p className={styles.studyStatus}>
                        <span>{study.status === 'completed' ? 'Finalizado' : 'En curso'}</span>
                        {study.year !== null && (
                          <span>
                            {study.status === 'in_progress'
                              ? `Finalización prevista: ${study.year}`
                              : study.year}
                          </span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {!!confirmed?.competencies.length && (
              <section aria-labelledby="cv-competencies" className={styles.section}>
                <h2 id="cv-competencies" className={styles.sectionTitle}>
                  Competencias profesionales
                </h2>
                <ul className={styles.entries}>
                  {confirmed.competencies.map(({ candidate }) => (
                    <li key={candidate.id} data-source-experience-id={candidate.experienceId}>
                      <p>{candidate.label}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>
        )}
      </div>
      <div className={`${styles.screenOnly} ${styles.notices}`}>
        {!contactResult.ok && (
          <p role="alert">
            No se pudieron leer tus datos de contacto. El historial confirmado se muestra de forma
            independiente.
          </p>
        )}
        {contactResult.ok && !Object.values(contact ?? {}).some((value) => value?.trim()) && (
          <p>No has indicado datos de contacto para este borrador.</p>
        )}
        <section aria-labelledby="cv-missing-data" className="min-w-0 space-y-2">
          <h2 id="cv-missing-data" className="font-semibold">
            Datos pendientes para completar el CV
          </h2>
          <p>
            Solo se muestran los datos de contacto que hayas indicado; no se utiliza tu email de
            acceso ni se inventan datos.
          </p>
          <p>
            La experiencia solo se muestra con descripciones confirmadas por ti. Si no has
            confirmado ninguna, esa parte del CV queda pendiente; no se inventa experiencia.
          </p>
        </section>
        {!educationResult.ok ? (
          <p role="alert">{educationResult.error.message}</p>
        ) : !educationResult.data?.length ? (
          <p>No has registrado estudios para este borrador.</p>
        ) : null}
        {content}
      </div>
    </PageShell>
  );
}
