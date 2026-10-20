'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ProfessionalExperienceEditor,
  type ExperienceEditorState,
} from '@/features/translation/components/professional-experience-editor';
import type { StructuredExperience } from '@/features/translation/schemas/structured-experience.schema';
import { saveExperienciaStepAction } from '../actions/save-experiencia-step-action';
import {
  LEADERSHIP_SCOPE_OPTIONS,
  MISSION_TYPE_OPTIONS,
  RESPONSIBILITY_AREA_OPTIONS,
  TOOL_OPTIONS,
} from '../config/wizard-catalogs';
import type { ExperienciaStepPayload } from '../types/wizard.types';
import { CatalogMultiSelect } from './catalog-multi-select';

export function OnboardingExperienceStep({
  values,
  initialExperiences,
  initialError,
  completed,
}: {
  values: ExperienciaStepPayload;
  initialExperiences: StructuredExperience[];
  initialError?: string;
  completed: boolean;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<ExperienceEditorState>({
    dirty: false,
    pending: false,
    reading: false,
    loaded: !initialError,
  });
  const [complementDirty, setComplementDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const submitting = useRef(false);
  const leaving = useRef(false);
  const busy = pending || editor.pending || editor.reading;
  const dirty = complementDirty || editor.dirty;

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (!leaving.current && (dirty || busy)) {
        event.preventDefault();
        event.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);

  async function submit(data: FormData) {
    if (submitting.current || busy || !editor.loaded) return;
    if (
      editor.dirty &&
      !window.confirm(
        'Tienes una experiencia sin guardar. Guarda la experiencia con su botón o confirma que quieres descartar ese borrador y continuar.',
      )
    )
      return;
    submitting.current = true;
    setPending(true);
    setError(undefined);
    try {
      const result = await saveExperienciaStepAction(data);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      leaving.current = true;
      router.push(result.data.nextHref);
    } catch {
      leaving.current = false;
      setError('No se pudo guardar el paso. Tu borrador se conserva; reintenta.');
    } finally {
      if (!leaving.current) {
        submitting.current = false;
        setPending(false);
      }
    }
  }

  return (
    <div className="space-y-6">
      <fieldset disabled={pending} className="min-w-0">
        <ProfessionalExperienceEditor
          initialExperiences={initialExperiences}
          initialError={initialError}
          onStateChange={setEditor}
        />
      </fieldset>
      <p className="text-sm text-slate-600">
        Cada experiencia se guarda con su propio botón. Continuar guarda solo la información
        complementaria y el avance de este paso.
      </p>
      {!editor.loaded ? (
        <p role="status">Reintenta la lectura del historial antes de continuar.</p>
      ) : null}
      <form
        aria-label="Información complementaria de experiencia"
        aria-busy={pending}
        className="space-y-6"
        onChange={() => setComplementDirty(true)}
        onSubmit={(event) => {
          event.preventDefault();
          void submit(new FormData(event.currentTarget));
        }}
      >
        <fieldset disabled={busy}>
          <details className="space-y-4 rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-900">
              Información complementaria (opcional)
            </summary>
            <p className="text-sm text-slate-600">
              Estos datos describen tu trayectoria en general, no se asignan a ninguna experiencia
              concreta. Las funciones globales guardadas anteriormente se conservan, pero ya no se
              capturan aquí.
            </p>
            {[
              'responsibilityAreas',
              'missionTypes',
              'achievements',
              'tools',
              'leadershipScopes',
              'additionalContext',
            ].map((name) => (
              <input key={name} type="hidden" name="_experienceFields" value={name} />
            ))}
            <CatalogMultiSelect
              name="responsibilityAreas"
              label="Areas de responsabilidad"
              options={RESPONSIBILITY_AREA_OPTIONS}
              selectedValues={values.responsibilityAreas}
            />
            <CatalogMultiSelect
              name="missionTypes"
              label="Tipos de mision"
              options={MISSION_TYPE_OPTIONS}
              selectedValues={values.missionTypes}
            />
            <div className="space-y-2">
              <label htmlFor="achievements" className="text-sm font-medium text-slate-900">
                Logros
              </label>
              <Textarea
                id="achievements"
                name="achievements"
                defaultValue={values.achievements.join('\n')}
              />
            </div>
            <CatalogMultiSelect
              name="tools"
              label="Herramientas"
              options={TOOL_OPTIONS}
              selectedValues={values.tools}
            />
            <CatalogMultiSelect
              name="leadershipScopes"
              label="Alcance de liderazgo"
              options={LEADERSHIP_SCOPE_OPTIONS}
              selectedValues={values.leadershipScopes}
            />
            <div className="space-y-2">
              <label htmlFor="additionalContext" className="text-sm font-medium text-slate-900">
                Contexto adicional
              </label>
              <Textarea
                id="additionalContext"
                name="additionalContext"
                defaultValue={values.additionalContext ?? ''}
              />
            </div>
          </details>
        </fieldset>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {pending ? <p role="status">Guardando información complementaria y avance…</p> : null}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={completed ? '/perfil' : '/onboarding/militar'}
            className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
            aria-disabled={busy}
            onNavigate={(event) => {
              if (
                busy ||
                (dirty &&
                  !window.confirm('Tienes cambios sin guardar. ¿Descartar el borrador y volver?'))
              )
                event.preventDefault();
              else leaving.current = true;
            }}
          >
            {completed ? 'Volver al perfil' : 'Volver'}
          </Link>
          <Button type="submit" disabled={busy || !editor.loaded}>
            {completed ? 'Guardar información complementaria' : 'Continuar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
