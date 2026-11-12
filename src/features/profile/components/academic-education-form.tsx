'use client';

import { useRef, useState } from 'react';
import { saveAcademicEducationAction } from '../actions/save-academic-education-action';
import {
  academicStudySchema,
  type AcademicEducation,
  type AcademicStudy,
} from '../schemas/academic-education.schema';

type Draft = { id: string; title: string; institution: string; year: string; status: string };

export function AcademicEducationForm({ initial }: { initial: AcademicEducation | null }) {
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const originalDraft = useRef<Draft | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  function open(study?: AcademicStudy) {
    if (busy.current || draft) return;
    const next = study
      ? { ...study, institution: study.institution ?? '', year: study.year?.toString() ?? '' }
      : { id: crypto.randomUUID(), title: '', institution: '', year: '', status: '' };
    originalDraft.current = next;
    setDraft(next);
    setErrors({});
    setMessage(null);
  }

  async function save(academicEducation: AcademicEducation) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setMessage(null);
    try {
      const result = await saveAcademicEducationAction({ expected: baseline, academicEducation });
      if (result.ok) {
        setBaseline(result.data);
        setDraft(null);
        originalDraft.current = null;
        setMessage({ error: false, text: 'Estudios guardados.' });
      } else setMessage({ error: true, text: result.error.message });
    } catch {
      setMessage({
        error: true,
        text: 'No se pudo confirmar el guardado. Tus cambios se conservan en el formulario.',
      });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <p className="text-sm text-slate-600">
        Registra los estudios que quieras mostrar en tu CV. El centro y el año son opcionales. Estos
        datos son declarados por ti; no acreditan titulaciones ni equivalencias.
      </p>
      {baseline?.length ? (
        <ul className="space-y-4">
          {baseline.map((study) => (
            <li
              key={study.id}
              className="min-w-0 space-y-2 rounded-xl border border-slate-200 bg-white p-4"
            >
              <h2 className="break-words font-semibold">{study.title}</h2>
              {study.institution && <p className="break-words">{study.institution}</p>}
              <p>{study.status === 'completed' ? 'Finalizado' : 'En curso'}</p>
              {study.year !== null && (
                <p>
                  {study.status === 'in_progress'
                    ? `Finalización prevista: ${study.year}`
                    : study.year}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={pending || draft !== null}
                  aria-label={`Editar ${study.title}`}
                  onClick={() => open(study)}
                  className="rounded-md border px-4 py-2 disabled:opacity-50"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={pending || draft !== null}
                  aria-label={`Eliminar ${study.title}`}
                  onClick={() => {
                    if (!busy.current && window.confirm(`¿Eliminar el estudio «${study.title}»?`))
                      void save(baseline.filter(({ id }) => id !== study.id));
                  }}
                  className="rounded-md border px-4 py-2 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No has registrado estudios.</p>
      )}
      {!draft && (
        <button
          type="button"
          disabled={pending}
          onClick={() => open()}
          className="rounded-md border px-4 py-2"
        >
          Añadir estudios
        </button>
      )}
      {draft && (
        <form
          noValidate
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy.current) return;
            const form = event.currentTarget;
            const parsed = academicStudySchema.safeParse({
              ...draft,
              year: draft.year.trim() === '' ? null : Number(draft.year),
            });
            if (!parsed.success) {
              const nextErrors: typeof errors = {};
              for (const issue of parsed.error.issues)
                nextErrors[issue.path[0] as keyof Draft] = issue.message;
              setErrors(nextErrors);
              const name = parsed.error.issues[0]?.path[0];
              if (typeof name === 'string') (form.elements.namedItem(name) as HTMLElement)?.focus();
              return;
            }
            const entries = baseline ?? [];
            await save(
              entries.some(({ id }) => id === draft.id)
                ? entries.map((study) => (study.id === draft.id ? parsed.data : study))
                : [...entries, parsed.data],
            );
          }}
          onChange={() => {
            setErrors({});
            setMessage(null);
          }}
        >
          <fieldset disabled={pending} className="grid min-w-0 gap-5 sm:grid-cols-2">
            <legend className="mb-4 font-semibold">
              {baseline?.some(({ id }) => id === draft.id) ? 'Editar estudio' : 'Nuevo estudio'}
            </legend>
            {(['title', 'institution', 'status', 'year'] as const).map((name) => (
              <div
                key={name}
                className={`min-w-0 space-y-2 ${name === 'title' ? 'sm:col-span-2' : ''}`}
              >
                <label htmlFor={name} className="block font-medium">
                  {name === 'title'
                    ? 'Nombre de los estudios'
                    : name === 'institution'
                      ? 'Centro (opcional)'
                      : name === 'status'
                        ? 'Estado'
                        : draft.status === 'in_progress'
                          ? 'Año previsto de finalización (opcional)'
                          : 'Año de finalización (opcional)'}
                </label>
                {name === 'status' ? (
                  <select
                    id={name}
                    name={name}
                    value={draft.status}
                    required
                    aria-invalid={Boolean(errors[name])}
                    aria-describedby={errors[name] ? `${name}-error` : undefined}
                    className="w-full rounded-md border p-2"
                    onChange={(event) => {
                      if (!busy.current) setDraft({ ...draft, status: event.currentTarget.value });
                    }}
                  >
                    <option value="">Sin indicar</option>
                    <option value="completed">Finalizado</option>
                    <option value="in_progress">En curso</option>
                  </select>
                ) : (
                  <input
                    id={name}
                    name={name}
                    type={name === 'year' ? 'number' : 'text'}
                    min={name === 'year' ? 1000 : undefined}
                    max={name === 'year' ? 9999 : undefined}
                    step={name === 'year' ? 1 : undefined}
                    maxLength={name === 'year' ? undefined : 200}
                    required={name === 'title'}
                    value={draft[name]}
                    aria-invalid={Boolean(errors[name])}
                    aria-describedby={errors[name] ? `${name}-error` : undefined}
                    className="w-full rounded-md border p-2"
                    onChange={(event) => {
                      if (!busy.current) setDraft({ ...draft, [name]: event.currentTarget.value });
                    }}
                  />
                )}
                {errors[name] && (
                  <p id={`${name}-error`} role="alert" className="text-sm">
                    {errors[name]}
                  </p>
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button type="submit" className="rounded-md border px-4 py-2">
                {pending ? 'Guardando...' : 'Guardar estudio'}
              </button>
              <button
                type="button"
                className="rounded-md border px-4 py-2"
                onClick={() => {
                  if (busy.current) return;
                  if (
                    JSON.stringify(draft) !== JSON.stringify(originalDraft.current) &&
                    !window.confirm('¿Descartar los cambios sin guardar de este estudio?')
                  )
                    return;
                  setDraft(null);
                  setErrors({});
                  setMessage(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {message && (
        <p
          role={message.error ? 'alert' : 'status'}
          tabIndex={-1}
          ref={(element) => {
            if (message.error) element?.focus();
          }}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
