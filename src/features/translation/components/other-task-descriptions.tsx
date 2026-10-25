'use client';

import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { editExperienceAction } from '@/features/profile/actions/save-experience-action';
import { editExperienceInputSchema } from '@/features/profile/schemas/save-experience.schema';
import { FUNCTION_TYPE_OPTIONS } from '@/features/wizard/config/wizard-catalogs';
import type { StructuredExperience } from '../schemas/structured-experience.schema';

export function OtherTaskDescriptions({ experiences }: { experiences: StructuredExperience[] }) {
  // A new server snapshot resets drafts, including when tasks have been reordered.
  return <TaskDescriptions key={JSON.stringify(experiences)} experiences={experiences} />;
}

function TaskDescriptions({ experiences }: { experiences: StructuredExperience[] }) {
  const id = useId();
  const [saved, setSaved] = useState(experiences);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saving = useRef(new Set<string>());

  async function save(experience: StructuredExperience, index: number, remove = false) {
    if (saving.current.has(experience.id)) return;
    const draftKey = `${experience.id}:${index}`;
    const otherTasks = experience.otherTasks!.map((task, position) => {
      if (position !== index) return task;
      const next = { ...task };
      if (remove) delete next.confirmedDescription;
      else next.confirmedDescription = drafts[draftKey];
      return next;
    });
    const parsed = editExperienceInputSchema.safeParse({
      id: experience.id,
      expectedExperience: experience,
      set: { otherTasks },
    });
    if (!parsed.success) {
      setErrors((previous) => ({
        ...previous,
        [experience.id]: 'Escribe entre 1 y 500 caracteres. Tu borrador se conserva.',
      }));
      return;
    }
    saving.current.add(experience.id);
    setPending((previous) => ({ ...previous, [experience.id]: true }));
    setErrors((previous) => ({ ...previous, [experience.id]: '' }));
    try {
      const result = await editExperienceAction(parsed.data);
      if (!result.ok) {
        setErrors((previous) => ({
          ...previous,
          [experience.id]:
            result.error.code === 'CONFLICT'
              ? 'La experiencia ha cambiado. Tu borrador se conserva; cópialo antes de recargar para consultar la versión guardada. No se ha guardado este cambio.'
              : `${result.error.message}. Tu borrador se conserva. No se ha guardado este cambio.`,
        }));
        return;
      }
      setSaved((previous) =>
        previous.map((entry) => (entry.id === experience.id ? result.data.experience : entry)),
      );
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[draftKey];
        return next;
      });
    } catch {
      setErrors((previous) => ({
        ...previous,
        [experience.id]: 'No se pudo guardar. Tu borrador se conserva.',
      }));
    } finally {
      saving.current.delete(experience.id);
      setPending((previous) => ({ ...previous, [experience.id]: false }));
    }
  }

  return (
    <>
      {Object.entries(errors).map(([experienceId, error]) =>
        error ? (
          <p key={experienceId} role="alert">
            {error}
          </p>
        ) : null,
      )}
      {([false, true] as const).map((confirmed) => {
        const entries = saved.flatMap((experience, experienceIndex) =>
          (experience.otherTasks ?? []).flatMap((task, index) =>
            Boolean(task.confirmedDescription) === confirmed
              ? [{ experience, experienceIndex, task, index }]
              : [],
          ),
        );
        if (!entries.length) return null;
        const titleId = `${id}-${confirmed ? 'confirmed' : 'pending'}`;
        return (
          <section
            key={titleId}
            aria-labelledby={titleId}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2 id={titleId} className="text-base font-semibold">
              {confirmed
                ? 'Descripciones confirmadas por el usuario'
                : 'Pendientes de interpretación'}
            </h2>
            <p className="text-sm text-slate-700">
              {confirmed
                ? 'Texto revisado por ti, no una competencia ni una acreditación. No se ha añadido a ningún CV.'
                : 'Tareas declaradas por ti, sin traducción automática. No generan competencias ni se han incorporado a tu CV.'}
            </p>
            {entries.map(({ experience, experienceIndex, task, index }) => {
              const draftKey = `${experience.id}:${index}`;
              const editing = Object.hasOwn(drafts, draftKey);
              const textareaId = `${id}-${experienceIndex}-${index}`;
              return (
                <article
                  key={`${draftKey}:${task.description}:${task.target}`}
                  className="space-y-3 border-t border-slate-200 pt-4"
                >
                  <h3 className="text-sm font-medium">
                    Experiencia {experienceIndex + 1}:{' '}
                    {experience.activity === 'reporting'
                      ? 'Elaboración de informes'
                      : FUNCTION_TYPE_OPTIONS.find((option) => option.value === experience.activity)
                          ?.label}
                  </h3>
                  <dl className="space-y-1 whitespace-pre-wrap break-words text-sm text-slate-700">
                    <dt className="font-medium">
                      Tu descripción, sin interpretar · Tarea {index + 1}
                    </dt>
                    <dd>{task.description}</dd>
                    <dt className="font-medium">Sobre qué trabajabas</dt>
                    <dd>{task.target}</dd>
                    {confirmed ? (
                      <>
                        <dt className="font-medium">Descripción confirmada por ti</dt>
                        <dd>{task.confirmedDescription}</dd>
                      </>
                    ) : null}
                  </dl>
                  <fieldset
                    disabled={pending[experience.id]}
                    aria-busy={Boolean(pending[experience.id])}
                    className="min-w-0 space-y-3"
                  >
                    {editing ? (
                      <>
                        <p id={`${textareaId}-help`} className="text-sm text-slate-700">
                          Borrador elaborado únicamente con tu declaración. Revísalo y corrígelo
                          antes de confirmar. No incluyas información militar clasificada,
                          restringida ni operativa sensible: unidades, ubicaciones, modelos,
                          procedimientos ni nombres de personas. No se ha añadido a ningún CV.
                        </p>
                        <label htmlFor={textareaId} className="block text-sm font-medium">
                          Descripción para CV · Tarea {index + 1}
                        </label>
                        <textarea
                          id={textareaId}
                          aria-describedby={`${textareaId}-help ${textareaId}-count`}
                          value={drafts[draftKey]}
                          maxLength={500}
                          rows={4}
                          className="w-full rounded-xl border border-slate-300 p-3 text-sm"
                          onChange={(event) =>
                            setDrafts((previous) => ({
                              ...previous,
                              [draftKey]: event.target.value,
                            }))
                          }
                        />
                        <p id={`${textareaId}-count`} className="text-sm text-slate-600">
                          {drafts[draftKey].length}/500 caracteres
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <Button type="button" onClick={() => void save(experience, index)}>
                            Confirmar descripción
                          </Button>
                          <Button
                            type="button"
                            onClick={() =>
                              setDrafts((previous) => {
                                const next = { ...previous };
                                delete next[draftKey];
                                return next;
                              })
                            }
                          >
                            Descartar borrador
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button
                        type="button"
                        onClick={() =>
                          setDrafts((previous) => ({
                            ...previous,
                            [draftKey]:
                              task.confirmedDescription ?? `${task.description} (${task.target})`,
                          }))
                        }
                      >
                        {confirmed ? 'Editar descripción' : 'Preparar descripción para CV'}
                      </Button>
                    )}
                    {confirmed ? (
                      <Button type="button" onClick={() => void save(experience, index, true)}>
                        Retirar confirmación
                      </Button>
                    ) : null}
                    {pending[experience.id] ? <p role="status">Guardando cambio...</p> : null}
                  </fieldset>
                </article>
              );
            })}
          </section>
        );
      })}
    </>
  );
}
