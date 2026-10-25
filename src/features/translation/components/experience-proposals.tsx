'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { editExperienceAction } from '@/features/profile/actions/save-experience-action';
import type { ExperienceProposal } from '../types/experience-proposal.types';
import type { StructuredExperience } from '../schemas/structured-experience.schema';
import {
  competencyEvidenceKey,
  resolveCompetencyReview,
  type CompetencyReviewDecision,
} from '../services/competency-review';
import { MAINTENANCE_MATERIALS, MAINTENANCE_OPERATIONS } from '../config/maintenance-catalog';

export function ExperienceProposals({
  experiences,
  ...props
}: {
  proposals: ExperienceProposal[];
  hasExperiences: boolean;
  experiences: StructuredExperience[];
}) {
  return (
    <ReviewableProposals key={JSON.stringify(experiences)} {...props} experiences={experiences} />
  );
}

function ReviewableProposals({
  proposals,
  hasExperiences,
  experiences,
}: {
  proposals: ExperienceProposal[];
  hasExperiences: boolean;
  experiences: StructuredExperience[];
}) {
  const [saved, setSaved] = useState(experiences);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saving = useRef(new Set<string>());

  async function review(
    proposal: ExperienceProposal,
    experience: StructuredExperience,
    decision: CompetencyReviewDecision | 'pending',
  ) {
    if (saving.current.has(experience.id)) return;
    const candidate = proposal.civilianCompetencyCandidate;
    const reviews = (experience.competencyReviews ?? []).filter(
      (entry) =>
        entry.competencyId !== candidate.id &&
        proposals.some(
          ({ civilianCompetencyCandidate: other }) =>
            other.experienceId === experience.id &&
            other.id === entry.competencyId &&
            competencyEvidenceKey(other) === entry.evidenceKey,
        ),
    );
    if (decision !== 'pending')
      reviews.push({
        competencyId: candidate.id,
        evidenceKey: competencyEvidenceKey(candidate),
        decision,
      });
    saving.current.add(experience.id);
    setPending((previous) => ({ ...previous, [experience.id]: true }));
    setErrors((previous) => ({ ...previous, [experience.id]: '' }));
    try {
      const result = await editExperienceAction({
        id: experience.id,
        expectedExperience: experience,
        set: reviews.length ? { competencyReviews: reviews } : {},
        clear: reviews.length ? [] : ['competencyReviews'],
      });
      if (!result.ok) {
        setErrors((previous) => ({
          ...previous,
          [experience.id]:
            result.error.code === 'CONFLICT'
              ? 'La experiencia ha cambiado. Recarga para revisar su evidencia actual. No se ha guardado esta decisión.'
              : `${result.error.message}. No se ha guardado esta decisión.`,
        }));
        return;
      }
      setSaved((previous) =>
        previous.map((entry) => (entry.id === experience.id ? result.data.experience : entry)),
      );
    } catch {
      setErrors((previous) => ({
        ...previous,
        [experience.id]: 'No se pudo guardar esta decisión. Intenta de nuevo.',
      }));
    } finally {
      saving.current.delete(experience.id);
      setPending((previous) => ({ ...previous, [experience.id]: false }));
    }
  }

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
            ? 'No hay propuestas fundamentadas para estas experiencias. Se necesita formación con participación declarada, o mantenimiento con material y operaciones declaradas en la misma experiencia; la actividad por sí sola no basta.'
            : 'No hay experiencias guardadas para fundamentar propuestas.'}
        </p>
      ) : (
        proposals.map((proposal) => {
          const experience = saved.find((entry) => entry.id === proposal.experienceId);
          const state = experience
            ? resolveCompetencyReview(proposal.civilianCompetencyCandidate, experience)
            : 'pending';
          return (
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
                  <p role="status" className="text-sm font-medium text-slate-900">
                    {state === 'accepted'
                      ? 'Aceptada por ti'
                      : state === 'discarded'
                        ? 'Descartada por ti'
                        : 'Pendiente de revisión'}
                  </p>
                  {experience ? (
                    <fieldset
                      disabled={pending[experience.id]}
                      aria-busy={Boolean(pending[experience.id])}
                      className="mt-3 min-w-0 space-y-2"
                    >
                      <legend className="text-sm text-slate-700">
                        Revisar competencia candidata
                      </legend>
                      <p className="text-sm text-slate-600">
                        Tu decisión no acredita esta competencia ni la añade a un CV.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          aria-pressed={state === 'accepted'}
                          disabled={state === 'accepted'}
                          onClick={() => void review(proposal, experience, 'accepted')}
                        >
                          Aceptar
                        </Button>
                        <Button
                          type="button"
                          aria-pressed={state === 'discarded'}
                          disabled={state === 'discarded'}
                          onClick={() => void review(proposal, experience, 'discarded')}
                        >
                          Descartar
                        </Button>
                        {state !== 'pending' ? (
                          <Button
                            type="button"
                            onClick={() => void review(proposal, experience, 'pending')}
                          >
                            Volver a pendiente
                          </Button>
                        ) : null}
                      </div>
                      {pending[experience.id] ? <p role="status">Guardando decisión...</p> : null}
                      {errors[experience.id] ? <p role="alert">{errors[experience.id]}</p> : null}
                    </fieldset>
                  ) : null}
                </div>
              </div>
              <ul
                aria-label="Evidencia utilizada"
                className="list-disc space-y-1 pl-5 text-sm text-slate-600"
              >
                <li>Actividad: {proposal.sourceLabel}</li>
                {proposal.participationLabel ? (
                  <li>Participación: {proposal.participationLabel}</li>
                ) : null}
                {proposal.maintenanceSource ? (
                  <>
                    <li>Material: {MAINTENANCE_MATERIALS[proposal.maintenanceSource.material]}</li>
                    <li>
                      Operaciones:{' '}
                      {proposal.maintenanceSource.operations
                        .map((operation) => MAINTENANCE_OPERATIONS[operation].label)
                        .join('; ')}
                    </li>
                  </>
                ) : null}
              </ul>
            </article>
          );
        })
      )}
    </section>
  );
}
