'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FUNCTION_TYPE_OPTIONS } from '@/features/wizard/config/wizard-catalogs';
import {
  structuredExperienceSchema,
  type StructuredExperience,
} from '../schemas/structured-experience.schema';

type OptionalField = 'durationRange' | 'frequency' | 'autonomy' | 'assignmentContext';

const OPTIONAL_FIELDS = {
  durationRange: {
    label: 'Duración aproximada (opcional)',
    options: {
      less_than_1_year: 'Menos de un año',
      one_to_five_years: 'Entre 1 y 5 años',
      more_than_5_years: 'Más de 5 años',
      not_sure: 'No lo recuerdo bien',
    },
  },
  frequency: {
    label: 'Frecuencia (opcional)',
    options: {
      daily_or_almost_daily: 'Todos o casi todos los días',
      several_times_per_week: 'Varias veces por semana',
      by_periods: 'Por periodos o temporadas',
      occasional: 'Ocasionalmente',
      not_sure: 'No lo recuerdo bien',
    },
  },
  autonomy: {
    label: 'Autonomía (opcional)',
    options: {
      supervised: 'Bajo supervisión',
      partially_autonomous: 'Con cierta autonomía',
      autonomous: 'De forma autónoma',
      not_sure: 'No lo tengo claro',
    },
  },
  assignmentContext: {
    label: 'Contexto de asignación (opcional)',
    options: {
      regular_duties: 'Era parte de mis funciones habituales',
      temporary_assignment: 'La realicé por asignación temporal',
      acting_replacement: 'Sustituía temporalmente a otra persona',
      not_sure: 'No lo recuerdo bien',
    },
  },
} satisfies {
  [K in OptionalField]: {
    label: string;
    options: Record<NonNullable<StructuredExperience[K]>, string>;
  };
};

const PARTICIPATION_LABELS = {
  assisted: 'Ayudaba a realizarla',
  performed: 'La realizaba personalmente',
  coordinated: 'Coordinaba el trabajo de otras personas',
  instructed: 'Enseñaba a otros a realizarla',
} satisfies Record<NonNullable<StructuredExperience['participation']>[number], string>;

const SELECT_CLASS_NAME =
  'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400';

export function LocalExperienceForm() {
  const formId = useId();
  const [experience, setExperience] = useState<StructuredExperience>({
    // Only one in-memory record: no cross-record identity or persistence is needed here.
    id: 'local-experience',
    activity: '',
  });
  const [attemptedReview, setAttemptedReview] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const validation = structuredExperienceSchema.safeParse(experience);
  const preview = validation.success ? validation.data : null;
  const activityInvalid = attemptedReview && !validation.success;
  const activityId = `${formId}-activity`;
  const activityLabel = (value: string) => {
    // The shared catalog's legacy English label is presented in Spanish, not changed in place.
    return value === 'reporting'
      ? 'Elaboración de informes'
      : FUNCTION_TYPE_OPTIONS.find((option) => option.value === value)?.label;
  };

  function renderOptionalField(name: OptionalField) {
    const field = OPTIONAL_FIELDS[name];
    const id = `${formId}-${name}`;
    return (
      <div className="space-y-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-900">
          {field.label}
        </label>
        <select
          id={id}
          name={name}
          value={experience[name] ?? ''}
          className={SELECT_CLASS_NAME}
          aria-describedby={name === 'assignmentContext' ? `${formId}-assignment-help` : undefined}
          onChange={(event) => {
            const value = event.target.value;
            const parsed = structuredExperienceSchema.shape[name].safeParse(value);
            if (value !== '' && !parsed.success) return;
            setExperience((previous) => {
              const next = { ...previous };
              delete next[name];
              return parsed.success ? { ...next, [name]: parsed.data } : next;
            });
          }}
        >
          <option value="">Sin responder</option>
          {Object.entries(field.options).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card>
        <CardHeader
          title="Una experiencia profesional"
          description="Elige una actividad que hayas realizado. Solo la actividad es obligatoria."
        />
        <CardContent>
          <form
            noValidate
            className="space-y-6"
            onChange={() => setReviewCount(0)}
            onSubmit={(event) => {
              event.preventDefault();
              setAttemptedReview(true);
              if (!validation.success) {
                setReviewCount(0);
                event.currentTarget.querySelector<HTMLSelectElement>('[name="activity"]')?.focus();
              } else {
                setReviewCount((previous) => previous + 1);
              }
            }}
          >
            <fieldset className="space-y-4">
              <legend className="mb-3 text-sm font-semibold text-slate-900">
                Actividad realizada
              </legend>
              <div className="space-y-2">
                <label htmlFor={activityId} className="text-sm font-medium text-slate-900">
                  Actividad (obligatoria)
                </label>
                <select
                  id={activityId}
                  name="activity"
                  required
                  value={experience.activity}
                  className={SELECT_CLASS_NAME}
                  aria-invalid={activityInvalid}
                  aria-describedby={activityInvalid ? `${formId}-activity-error` : undefined}
                  onChange={(event) => {
                    const activity = event.target.value;
                    setExperience((previous) => ({ ...previous, activity }));
                  }}
                >
                  <option value="">Selecciona una actividad</option>
                  {FUNCTION_TYPE_OPTIONS.map(({ value }) => (
                    <option key={value} value={value}>
                      {activityLabel(value)}
                    </option>
                  ))}
                </select>
                {activityInvalid ? (
                  <p id={`${formId}-activity-error`} role="alert" className="text-sm text-red-700">
                    Selecciona una actividad para revisar tu experiencia.
                  </p>
                ) : null}
              </div>
              {renderOptionalField('durationRange')}
              {renderOptionalField('frequency')}
            </fieldset>

            <details className="rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                Añadir detalles de mi experiencia (opcional)
              </summary>
              <div className="mt-4 space-y-5">
                {renderOptionalField('autonomy')}
                <fieldset aria-describedby={`${formId}-participation-help`} className="space-y-3">
                  <legend className="mb-2 text-sm font-medium text-slate-900">
                    Participación (opcional, puedes elegir varias)
                  </legend>
                  {Object.entries(PARTICIPATION_LABELS).map(([value, label]) => {
                    const participation = structuredExperienceSchema.shape.participation
                      .unwrap()
                      .element.parse(value);
                    const id = `${formId}-${participation}`;
                    return (
                      <label
                        key={value}
                        htmlFor={id}
                        className="flex min-h-11 items-center gap-3 text-sm"
                      >
                        <input
                          id={id}
                          type="checkbox"
                          name="participation"
                          value={participation}
                          checked={experience.participation?.includes(participation) ?? false}
                          className="size-5 shrink-0 accent-slate-900"
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setExperience((previous) => {
                              const values = (previous.participation ?? []).filter(
                                (item) => item !== participation,
                              );
                              if (checked) values.push(participation);
                              const next = { ...previous };
                              delete next.participation;
                              return values.length ? { ...next, participation: values } : next;
                            });
                          }}
                        />
                        {label}
                      </label>
                    );
                  })}
                  <p id={`${formId}-participation-help`} className="text-sm text-slate-600">
                    Coordinar no implica mando formal; instruir no acredita una titulación.
                  </p>
                </fieldset>
                {renderOptionalField('assignmentContext')}
                <p id={`${formId}-assignment-help`} className="text-sm text-slate-600">
                  Una sustitución temporal no implica un empleo superior ni un nombramiento.
                </p>
              </div>
            </details>
            <Button type="submit" className="min-h-11 w-full sm:w-auto">
              Revisar experiencia
            </Button>
            <p role="status" aria-live="polite" className="text-sm text-slate-700">
              {reviewCount > 0 ? (
                // Refresh the announcement on repeated reviews without duplicating live regions.
                <span key={reviewCount}>
                  Vista previa lista. Esta experiencia todavía no se ha guardado
                </span>
              ) : null}
            </p>
          </form>
        </CardContent>
      </Card>

      <section aria-label="Vista previa de la experiencia">
        <Card>
          <CardHeader title="Vista previa" description="Se actualiza al cambiar tus respuestas." />
          <CardContent className="space-y-4">
            <p className="rounded-xl bg-slate-100 p-3 text-sm font-medium text-slate-900">
              Esta es una vista previa. Todavía no se ha guardado en tu perfil
            </p>
            <p className="text-sm text-slate-600">
              Tus respuestas solo están en la memoria de esta página y se perderán al recargar o
              salir de esta página.
            </p>
            {preview ? (
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="font-medium text-slate-600">Actividad</dt>
                  <dd className="mt-1 text-slate-900">{activityLabel(preview.activity)}</dd>
                </div>
                {(Object.keys(OPTIONAL_FIELDS) as OptionalField[]).map((name) =>
                  preview[name] ? (
                    <div key={name}>
                      <dt className="font-medium text-slate-600">{OPTIONAL_FIELDS[name].label}</dt>
                      <dd className="mt-1 text-slate-900">
                        {
                          Object.entries(OPTIONAL_FIELDS[name].options).find(
                            ([value]) => value === preview[name],
                          )?.[1]
                        }
                      </dd>
                    </div>
                  ) : null,
                )}
                {preview.participation ? (
                  <div>
                    <dt className="font-medium text-slate-600">Participación</dt>
                    <dd className="mt-1 text-slate-900">
                      <ul className="list-disc space-y-1 pl-5">
                        {preview.participation.map((value) => (
                          <li key={value}>{PARTICIPATION_LABELS[value]}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="text-sm text-slate-600">
                Selecciona una actividad para ver tu experiencia.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
