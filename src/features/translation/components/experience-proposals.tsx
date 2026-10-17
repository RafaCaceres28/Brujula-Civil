import type { ExperienceProposal } from '../types/experience-proposal.types';

export function ExperienceProposals({
  proposals,
  hasExperiences,
}: {
  proposals: ExperienceProposal[];
  hasExperiences: boolean;
}) {
  return (
    <section
      aria-labelledby="experience-proposals-title"
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 id="experience-proposals-title" className="text-base font-semibold text-slate-900">
        Propuestas pendientes de revisión
      </h2>
      <p className="text-sm text-slate-700">
        Basadas en tu declaración, pendientes de revisión. No acreditan titulaciones ni
        certificaciones y no se han incorporado a tu CV.
      </p>
      {proposals.length === 0 ? (
        <p className="text-sm text-slate-700">
          {hasExperiences
            ? 'No hay propuestas fundamentadas para estas experiencias. Esta regla necesita una actividad de formación y participación declarada en la misma experiencia; la actividad por sí sola no basta.'
            : 'No hay experiencias guardadas para fundamentar propuestas.'}
        </p>
      ) : (
        proposals.map((proposal) => (
          <article key={proposal.id} className="space-y-3 border-t border-slate-200 pt-4">
            <p className="break-words text-sm text-slate-600">
              Experiencia: {proposal.sourceLabel}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-medium text-slate-900">Descripción propuesta para CV</h3>
                <p className="text-sm text-slate-700">{proposal.cvDescription.text}</p>
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Competencia civil candidata</h3>
                <p className="text-sm text-slate-700">
                  {proposal.civilianCompetencyCandidate.label}
                </p>
              </div>
            </div>
            <ul
              aria-label="Evidencia utilizada"
              className="list-disc space-y-1 pl-5 text-sm text-slate-600"
            >
              <li>Actividad: {proposal.sourceLabel}</li>
              <li>Participación: {proposal.participationLabel}</li>
            </ul>
          </article>
        ))
      )}
    </section>
  );
}
