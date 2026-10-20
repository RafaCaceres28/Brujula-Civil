'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { readExperiencesAction } from '@/features/profile/actions/read-experiences-action';
import { FUNCTION_TYPE_OPTIONS } from '@/features/wizard/config/wizard-catalogs';
import type { StructuredExperience } from '../schemas/structured-experience.schema';
import { LocalExperienceForm } from './local-experience-form';

export type ExperienceEditorState = {
  dirty: boolean;
  pending: boolean;
  reading: boolean;
  loaded: boolean;
};

export function ProfessionalExperienceEditor({
  initialExperiences,
  initialError,
  onStateChange,
}: {
  initialExperiences: StructuredExperience[];
  initialError?: string;
  onStateChange?: (state: ExperienceEditorState) => void;
}) {
  const [experiences, setExperiences] = useState(initialExperiences);
  const [error, setError] = useState(initialError);
  const [loaded, setLoaded] = useState(!initialError);
  const [reading, setReading] = useState(false);
  const readingRef = useRef(false);
  const [editor, setEditor] = useState<{
    experience: StructuredExperience;
    mode: 'create' | 'edit';
    key: number;
  }>();
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [current, setCurrent] = useState<StructuredExperience>();
  const [conflict, setConflict] = useState(false);
  const notifyState = useEffectEvent((state: ExperienceEditorState) => onStateChange?.(state));
  useEffect(() => {
    notifyState({ dirty, pending, reading, loaded });
  }, [dirty, pending, reading, loaded]);
  const label = (activity: string) =>
    activity === 'reporting'
      ? 'Elaboración de informes'
      : FUNCTION_TYPE_OPTIONS.find((option) => option.value === activity)?.label;

  function open(experience?: StructuredExperience) {
    if (pending || readingRef.current) return;
    if (dirty && !window.confirm('Tienes cambios sin guardar. ¿Descartar el borrador y continuar?'))
      return;
    const nextExperience = experience ?? { id: `experience-${crypto.randomUUID()}`, activity: '' };
    setEditor((previous) => ({
      experience: nextExperience,
      mode: experience ? 'edit' : 'create',
      key: (previous?.key ?? 0) + 1,
    }));
    setDirty(false);
    setCurrent(undefined);
    setConflict(false);
    setError(undefined);
  }

  async function read() {
    if (readingRef.current || pending) return;
    readingRef.current = true;
    setReading(true);
    setError(undefined);
    setCurrent(undefined);
    try {
      const result = await readExperiencesAction();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setExperiences(result.data.experiences);
      setLoaded(true);
      if (editor) {
        const found = result.data.experiences.find((item) => item.id === editor.experience.id);
        if (found) setCurrent(found);
        else
          setError(
            'La experiencia ya no está guardada. Tu borrador se conserva; no se ha reemplazado.',
          );
      }
    } catch {
      setError('No se pudo cargar el historial. Tu borrador se conserva.');
    } finally {
      readingRef.current = false;
      setReading(false);
    }
  }

  return (
    <div className="space-y-6" aria-busy={reading}>
      <section aria-label="Experiencias guardadas" className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Experiencias guardadas</h2>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {loaded ? (
          <>
            {experiences.length ? (
              <ul className="space-y-3">
                {experiences.map((experience) => (
                  <li
                    key={experience.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <span className="min-w-0 break-words">{label(experience.activity)}</span>
                    <Button
                      type="button"
                      className="min-h-11 shrink-0"
                      aria-label={`Editar experiencia: ${label(experience.activity)}`}
                      disabled={pending || reading}
                      onClick={() => open(experience)}
                    >
                      Editar
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">Todavía no tienes experiencias guardadas.</p>
            )}
          </>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {loaded ? (
            <>
              <Button
                type="button"
                className="min-h-11"
                disabled={pending || reading}
                onClick={() => open()}
              >
                Añadir experiencia
              </Button>
              {conflict ? (
                <Button
                  type="button"
                  className="min-h-11"
                  disabled={pending || reading}
                  onClick={read}
                >
                  Consultar versión guardada
                </Button>
              ) : null}
            </>
          ) : (
            <Button type="button" className="min-h-11" disabled={reading} onClick={read}>
              Reintentar lectura
            </Button>
          )}
        </div>
        {reading ? <p role="status">Cargando historial guardado…</p> : null}
        {current ? (
          <div className="space-y-3 rounded-xl border border-slate-300 p-4">
            <p role="status">
              Versión guardada disponible: {label(current.activity)}. Tu borrador no ha cambiado.
            </p>
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              disabled={pending || reading}
              onClick={() => {
                if (
                  !window.confirm(
                    'Cargar la versión guardada descartará tu borrador actual. ¿Continuar?',
                  )
                )
                  return;
                setEditor((previous) => ({
                  experience: current,
                  mode: 'edit',
                  key: (previous?.key ?? 0) + 1,
                }));
                setDirty(false);
                setCurrent(undefined);
                setConflict(false);
                setError(undefined);
              }}
            >
              Cargar versión guardada
            </Button>
          </div>
        ) : null}
      </section>
      {editor ? (
        <LocalExperienceForm
          key={editor.key}
          initialExperience={editor.experience}
          mode={editor.mode}
          disabled={reading}
          onDirtyChange={setDirty}
          onPendingChange={setPending}
          onConflict={() => setConflict(true)}
          onSaved={(experience) => {
            setCurrent(undefined);
            setConflict(false);
            setError(undefined);
            setExperiences((previous) =>
              previous.some((item) => item.id === experience.id)
                ? previous.map((item) => (item.id === experience.id ? experience : item))
                : [...previous, experience],
            );
          }}
        />
      ) : null}
    </div>
  );
}
