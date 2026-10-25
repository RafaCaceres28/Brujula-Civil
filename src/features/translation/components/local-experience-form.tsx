'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FUNCTION_TYPE_OPTIONS } from '@/features/wizard/config/wizard-catalogs';
import {
  createExperienceAction,
  editExperienceAction,
} from '@/features/profile/actions/save-experience-action';
import {
  createExperienceInputSchema,
  editExperienceInputSchema,
} from '@/features/profile/schemas/save-experience.schema';
import type { DomainError } from '@/lib/contracts/domain-error';
import { INSTRUCTION_ACTIVITIES, type InstructionActivity } from '../config/instruction-activities';
import {
  MAINTENANCE_MATERIALS,
  MAINTENANCE_OPERATIONS,
  isMaintenanceOperationApplicable,
  type MaintenanceMaterial,
  type MaintenanceOperation,
} from '../config/maintenance-catalog';
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

export function LocalExperienceForm({
  initialExperience = { id: 'local-experience', activity: '' },
  mode = 'create',
  onSaved,
  onDirtyChange,
  onPendingChange,
  onConflict,
  disabled = false,
}: {
  initialExperience?: StructuredExperience;
  mode?: 'create' | 'edit';
  onSaved?: (experience: StructuredExperience) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
  onConflict?: () => void;
  disabled?: boolean;
}) {
  const formId = useId();
  const [experience, setExperience] = useState<StructuredExperience>(initialExperience);
  const [baseline, setBaseline] = useState(initialExperience);
  const [savedMode, setSavedMode] = useState(mode === 'edit');
  const [pending, setPending] = useState(false);
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState<DomainError>();
  const [confirmed, setConfirmed] = useState(false);
  const currentDraft = useRef(experience);
  const fields = [
    'activity',
    'durationRange',
    'frequency',
    'autonomy',
    'assignmentContext',
    'participation',
    'maintenanceTasks',
    'instructionActivities',
  ] as const;
  // Participation is a set for UI dirtiness; CAS still receives the untouched full baseline.
  const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
  const maintenanceSet = (entries: StructuredExperience['maintenanceTasks']) =>
    entries
      ?.map((entry) => ({
        ...entry,
        ...(entry.operations ? { operations: [...entry.operations].sort() } : {}),
      }))
      .sort((a, b) => a.material.localeCompare(b.material));
  const sameField = (
    field: (typeof fields)[number],
    left: StructuredExperience,
    right: StructuredExperience,
  ) =>
    field === 'participation' || field === 'instructionActivities'
      ? same(left[field]?.slice().sort(), right[field]?.slice().sort())
      : field === 'maintenanceTasks'
        ? same(maintenanceSet(left.maintenanceTasks), maintenanceSet(right.maintenanceTasks))
        : same(left[field], right[field]);
  const dirty = fields.some((field) => !sameField(field, experience, baseline));
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);
  function updateExperience(update: (previous: StructuredExperience) => StructuredExperience) {
    const next = update(currentDraft.current);
    currentDraft.current = next;
    setExperience(next);
    setConfirmed(false);
  }

  function toggleMaintenance(material: MaintenanceMaterial, operation?: MaintenanceOperation) {
    updateExperience((previous) => {
      const entries = previous.maintenanceTasks ?? [];
      const existing = entries.find((entry) => entry.material === material);
      let nextEntries: NonNullable<StructuredExperience['maintenanceTasks']>;
      if (!operation) {
        nextEntries = existing
          ? entries.filter((entry) => entry.material !== material)
          : [...entries, { material }];
      } else {
        const selected = existing?.operations ?? [];
        const operations = selected.includes(operation)
          ? selected.filter((value) => value !== operation)
          : [...selected, operation];
        const entry = operations.length
          ? { material, operations: operations.sort() }
          : { material };
        nextEntries = entries.map((value) => (value.material === material ? entry : value));
      }
      const next = { ...previous };
      delete next.maintenanceTasks;
      return nextEntries.length
        ? {
            ...next,
            maintenanceTasks: nextEntries.sort((a, b) => a.material.localeCompare(b.material)),
          }
        : next;
    });
  }

  async function save() {
    if (!onSaved || savingRef.current || disabled || (savedMode && !dirty)) return;
    setAttemptedSave(true);
    if (!validation.success) {
      if (validation.error.issues.some((issue) => issue.path[0] === 'activity')) {
        document.getElementById(activityId)?.focus();
      } else {
        setSaveError({ code: 'VALIDATION_ERROR', message: 'Revisa los datos antes de guardar.' });
      }
      return;
    }
    const submitted = experience;
    const set: Record<string, unknown> = {};
    const clear: string[] = [];
    fields.forEach((field) => {
      if (sameField(field, submitted, baseline)) return;
      if (submitted[field] === undefined) clear.push(field);
      else set[field] = submitted[field];
    });
    const parsed = savedMode
      ? editExperienceInputSchema.safeParse({
          id: baseline.id,
          expectedExperience: baseline,
          set,
          clear,
        })
      : createExperienceInputSchema.safeParse({ experience: submitted });
    if (!parsed.success) {
      setSaveError({ code: 'VALIDATION_ERROR', message: 'Revisa los datos antes de guardar.' });
      return;
    }
    savingRef.current = true;
    setPending(true);
    setConfirmed(false);
    setSaveError(undefined);
    try {
      const result = await (savedMode
        ? editExperienceAction(parsed.data)
        : createExperienceAction(parsed.data));
      if (!result.ok) {
        setSaveError(result.error);
        if (result.error.code === 'CONFLICT') onConflict?.();
        return;
      }
      const saved = result.data.experience;
      setBaseline(saved);
      setSavedMode(true);
      onSaved?.(saved);
      // A late response confirms only its captured payload, never a newer draft.
      if (currentDraft.current === submitted) {
        currentDraft.current = saved;
        setExperience(saved);
        setConfirmed(true);
      }
    } catch {
      setSaveError({
        code: 'EXTERNAL_DEPENDENCY_ERROR',
        message: 'No se pudo guardar. Tu borrador se conserva.',
      });
    } finally {
      savingRef.current = false;
      setPending(false);
    }
  }
  const [attemptedSave, setAttemptedSave] = useState(false);
  const validation = structuredExperienceSchema.safeParse(experience);
  const preview = validation.success ? validation.data : null;
  const activityInvalid =
    attemptedSave &&
    !validation.success &&
    validation.error.issues.some((issue) => issue.path[0] === 'activity');
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
            updateExperience((previous) => {
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
          title={
            onSaved
              ? savedMode
                ? 'Editar experiencia guardada'
                : 'Añadir experiencia'
              : 'Una experiencia profesional'
          }
          description="Elige una actividad que hayas realizado. Solo la actividad es obligatoria."
        />
        <CardContent>
          <form
            noValidate
            aria-busy={pending}
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <fieldset disabled={pending || disabled} className="space-y-6">
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
                      if (
                        activity !== 'op_maintenance' &&
                        experience.maintenanceTasks &&
                        !window.confirm(
                          'Cambiar de actividad eliminará los materiales y sus operaciones de mantenimiento. ¿Continuar?',
                        )
                      )
                        return;
                      if (
                        activity !== 'instruction' &&
                        experience.instructionActivities &&
                        !window.confirm(
                          'Cambiar de actividad eliminará los detalles de instrucción. ¿Continuar?',
                        )
                      )
                        return;
                      updateExperience((previous) => {
                        const next = { ...previous, activity };
                        if (activity !== 'op_maintenance') delete next.maintenanceTasks;
                        if (activity !== 'instruction') delete next.instructionActivities;
                        return next;
                      });
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
                    <p
                      id={`${formId}-activity-error`}
                      role="alert"
                      className="text-sm text-red-700"
                    >
                      Selecciona una actividad para guardar tu experiencia.
                    </p>
                  ) : null}
                </div>
                {experience.activity === 'op_maintenance' ? (
                  <details className="rounded-xl border border-slate-200 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                      Materiales y tareas de mantenimiento (opcional)
                    </summary>
                    <p className="my-3 text-sm text-slate-600">
                      Selecciona solo lo que declaras. Un material sin operaciones se guarda sin
                      generar propuestas. Estas tareas no acreditan una cualificación. Desmarcar un
                      material retira también sus operaciones.
                    </p>
                    <div className="space-y-4">
                      {(Object.keys(MAINTENANCE_MATERIALS) as MaintenanceMaterial[]).map(
                        (material) => {
                          const entry = experience.maintenanceTasks?.find(
                            (value) => value.material === material,
                          );
                          return (
                            <fieldset key={material} className="min-w-0 space-y-2">
                              <legend className="sr-only">{MAINTENANCE_MATERIALS[material]}</legend>
                              <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
                                <input
                                  type="checkbox"
                                  name="maintenanceMaterial"
                                  value={material}
                                  checked={!!entry}
                                  className="size-5 shrink-0 accent-slate-900"
                                  onChange={() => toggleMaintenance(material)}
                                />
                                {MAINTENANCE_MATERIALS[material]}
                              </label>
                              {entry ? (
                                <div className="space-y-2 pl-4">
                                  {(['inspect', 'conserve', 'repair', 'report'] as const).map(
                                    (category) => {
                                      const operations = (
                                        Object.keys(
                                          MAINTENANCE_OPERATIONS,
                                        ) as MaintenanceOperation[]
                                      ).filter(
                                        (operation) =>
                                          MAINTENANCE_OPERATIONS[operation].category === category &&
                                          isMaintenanceOperationApplicable(material, operation),
                                      );
                                      return operations.length ? (
                                        <fieldset key={category} className="space-y-1">
                                          <legend className="text-sm text-slate-600">
                                            {
                                              {
                                                inspect: 'Comprobaciones',
                                                conserve: 'Conservación',
                                                repair: 'Reparaciones',
                                                report: 'Incidencias',
                                              }[category]
                                            }
                                          </legend>
                                          {operations.map((operation) => (
                                            <label
                                              key={operation}
                                              className="flex min-h-11 items-center gap-3 text-sm"
                                            >
                                              <input
                                                type="checkbox"
                                                name="maintenanceOperation"
                                                value={`${material}:${operation}`}
                                                aria-label={`${MAINTENANCE_MATERIALS[material]}: ${MAINTENANCE_OPERATIONS[operation].label}`}
                                                checked={
                                                  entry.operations?.includes(operation) ?? false
                                                }
                                                className="size-5 shrink-0 accent-slate-900"
                                                onChange={() =>
                                                  toggleMaintenance(material, operation)
                                                }
                                              />
                                              {MAINTENANCE_OPERATIONS[operation].label}
                                            </label>
                                          ))}
                                        </fieldset>
                                      ) : null;
                                    },
                                  )}
                                </div>
                              ) : null}
                            </fieldset>
                          );
                        },
                      )}
                    </div>
                  </details>
                ) : null}
                {experience.activity === 'instruction' ? (
                  <fieldset aria-describedby={`${formId}-instruction-help`} className="space-y-3">
                    <legend className="text-sm font-medium text-slate-900">
                      ¿Qué hacías en instrucción? (opcional, puedes elegir varias)
                    </legend>
                    {(Object.keys(INSTRUCTION_ACTIVITIES) as InstructionActivity[]).map((value) => (
                      <label key={value} className="flex min-h-11 items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          name="instructionActivities"
                          value={value}
                          checked={experience.instructionActivities?.includes(value) ?? false}
                          className="size-5 shrink-0 accent-slate-900"
                          onChange={() =>
                            updateExperience((previous) => {
                              const selected = previous.instructionActivities ?? [];
                              const values = selected.includes(value)
                                ? selected.filter((item) => item !== value)
                                : [...selected, value];
                              const next = { ...previous };
                              delete next.instructionActivities;
                              return values.length
                                ? { ...next, instructionActivities: values.sort() }
                                : next;
                            })
                          }
                        />
                        {INSTRUCTION_ACTIVITIES[value]}
                      </label>
                    ))}
                    <p id={`${formId}-instruction-help`} className="text-sm text-slate-600">
                      Completa estos detalles para fundamentar propuestas de instrucción; la
                      participación general no es suficiente. Recibir formación o participar en
                      prácticas no demuestra por sí solo capacidad para impartirla. No acreditan
                      titulaciones. Sin estos detalles no se generan propuestas de instrucción,
                      tampoco si los eliminas.
                    </p>
                  </fieldset>
                ) : null}
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
                              updateExperience((previous) => {
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
              {onSaved ? (
                <Button
                  type="submit"
                  className="min-h-11 w-full sm:w-auto"
                  disabled={savedMode && !dirty}
                >
                  {savedMode ? 'Guardar cambios' : 'Guardar experiencia'}
                </Button>
              ) : null}
            </fieldset>
            {pending ? <p role="status">Guardando experiencia…</p> : null}
            {confirmed ? <p role="status">Experiencia guardada en tu perfil.</p> : null}
            {saveError ? (
              <p role="alert" className="text-sm text-red-700">
                {saveError.code === 'UNAUTHORIZED'
                  ? 'Tu sesión ha caducado. Inicia sesión para guardar; tu borrador se conserva.'
                  : saveError.code === 'CONFLICT'
                    ? 'La experiencia ha cambiado. Consulta la versión guardada antes de continuar; tu borrador se conserva.'
                    : saveError.code === 'NOT_FOUND'
                      ? 'La experiencia ya no está guardada. Tu borrador se conserva.'
                      : saveError.code === 'VALIDATION_ERROR'
                        ? 'No se pudo validar la experiencia. Revisa los datos; tu borrador se conserva.'
                        : 'No se pudo guardar. Reintenta; tu borrador se conserva.'}
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <section aria-label="Vista previa de la experiencia">
        <Card>
          <CardHeader title="Vista previa" description="Se actualiza al cambiar tus respuestas." />
          <CardContent className="space-y-4">
            <p className="rounded-xl bg-slate-100 p-3 text-sm font-medium text-slate-900">
              {onSaved
                ? 'Vista previa de tus respuestas. Solo Guardar confirma los cambios en tu perfil.'
                : 'Esta es una vista previa. Todavía no se ha guardado en tu perfil'}
            </p>
            <p className="text-sm text-slate-600">
              {onSaved
                ? 'Los cambios sin guardar se perderán al recargar o salir de esta página.'
                : 'Tus respuestas solo están en la memoria de esta página y se perderán al recargar o salir de esta página.'}
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
                {preview.maintenanceTasks?.map((entry) => (
                  <div key={entry.material}>
                    <dt className="font-medium text-slate-600">
                      {MAINTENANCE_MATERIALS[entry.material]}
                    </dt>
                    <dd className="mt-1 text-slate-900">
                      {entry.operations
                        ?.map((operation) => MAINTENANCE_OPERATIONS[operation].label)
                        .join('; ') ?? 'Sin operaciones declaradas; no genera propuestas.'}
                    </dd>
                  </div>
                ))}
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
                {preview.instructionActivities ? (
                  <div>
                    <dt className="font-medium text-slate-600">Detalles de instrucción</dt>
                    <dd className="mt-1 text-slate-900">
                      <ul className="list-disc space-y-1 pl-5">
                        {preview.instructionActivities.map((value) => (
                          <li key={value}>{INSTRUCTION_ACTIVITIES[value]}</li>
                        ))}
                      </ul>
                      <p>
                        Estos detalles, no los roles generales, fundamentan las propuestas de
                        instrucción.
                      </p>
                      {preview.instructionActivities.every(
                        (value) => value === 'received_training' || value === 'practiced_exercises',
                      ) ? (
                        <p>
                          Recibir formación o participar en prácticas no demuestra por sí solo
                          capacidad para impartirla. No hay evidencia suficiente para proponer una
                          competencia civil.
                        </p>
                      ) : null}
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
