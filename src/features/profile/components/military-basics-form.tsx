'use client';

import { useState } from 'react';
import { SPECIALTY_OPTIONS } from '@/features/wizard/config/wizard-catalogs';
import {
  MILITARY_BASICS_BRANCH_OPTIONS,
  MILITARY_BASICS_RANK_OPTIONS,
  MILITARY_BASICS_COMBINATION_ERROR,
  militaryBasicsCombinationAllowed,
  militaryBasicsRankOptions,
} from '../config/military-basics.catalog';
import { saveMilitaryBasicsAction } from '../actions/save-military-basics-action';
import type { MilitaryBasicsFields, MilitaryBasicsRow } from '../schemas/military-basics.schema';

export function MilitaryBasicsForm({ initial }: { initial: MilitaryBasicsRow | null }) {
  const [baseline, setBaseline] = useState(initial);
  const [selectedBranch, setSelectedBranch] = useState(initial?.branch ?? '');
  const [selectedRank, setSelectedRank] = useState(initial?.rank_text ?? '');
  const [rankError, setRankError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  return (
    <form
      className="space-y-6"
      onChange={() => {
        setMessage(null);
        setRankError(null);
      }}
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        const data = new FormData(form);
        const set: MilitaryBasicsFields = {};
        const branch = String(data.get('branch') ?? '') || null;
        const rank = String(data.get('rank') ?? '') || null;
        const specialty = String(data.get('specialty') ?? '') || null;
        const years = String(data.get('serviceYears') ?? '');
        const serviceYears = years === '' ? null : Number(years);
        if (String(data.get('branch') ?? '') !== (baseline?.branch ?? '')) {
          const option = MILITARY_BASICS_BRANCH_OPTIONS.find((item) => item.value === branch);
          if (branch !== null && !option) {
            setMessage({ error: true, text: 'Selecciona un ejército válido.' });
            return;
          }
          set.branch = option?.value ?? null;
        }
        if (String(data.get('rank') ?? '') !== (baseline?.rank_text ?? ''))
          set.rank = {
            code:
              MILITARY_BASICS_RANK_OPTIONS.find((item) => item.persistedLabel === rank)?.value ??
              null,
            label: rank,
          };
        if (String(data.get('specialty') ?? '') !== (baseline?.specialty_text ?? ''))
          set.specialty = {
            code: SPECIALTY_OPTIONS.find((item) => item.label === specialty)?.value ?? null,
            label: specialty,
          };
        if (serviceYears !== (baseline?.service_years ?? null)) set.serviceYears = serviceYears;
        if (
          (set.branch !== undefined || set.rank !== undefined) &&
          !militaryBasicsCombinationAllowed(branch, rank)
        ) {
          setRankError(MILITARY_BASICS_COMBINATION_ERROR);
          (form.elements.namedItem('rank') as HTMLSelectElement)?.focus();
          return;
        }
        setPending(true);
        setMessage(null);
        try {
          const result = await saveMilitaryBasicsAction({ expected: baseline, set });
          if (result.ok) {
            setBaseline(result.data);
            setSelectedBranch(result.data.branch ?? '');
            setSelectedRank(result.data.rank_text ?? '');
            setMessage({ error: false, text: 'Perfil militar guardado.' });
          } else setMessage({ error: true, text: result.error.message });
        } catch {
          setMessage({
            error: true,
            text: 'No se pudo confirmar el guardado. Tu borrador se conserva.',
          });
        } finally {
          setPending(false);
        }
      }}
    >
      <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 font-medium">Datos militares básicos</legend>
        {[
          {
            name: 'branch',
            label: 'Ejército',
            current: selectedBranch,
            options: MILITARY_BASICS_BRANCH_OPTIONS,
            codes: true,
          },
          {
            name: 'rank',
            label: 'Empleo / rango',
            current: selectedRank,
            options: militaryBasicsRankOptions(selectedBranch).map((item) => ({
              value: item.persistedLabel,
              label: item.label,
            })),
            codes: true,
          },
          {
            name: 'specialty',
            label: 'Especialidad',
            current: baseline?.specialty_text,
            options: SPECIALTY_OPTIONS,
            codes: false,
          },
        ].map(({ name, label, current, options, codes }) => {
          const legacy =
            current != null &&
            current !== '' &&
            !options.some((option) => (codes ? option.value : option.label) === current);
          return (
            <div key={name} className="space-y-2">
              <label htmlFor={name} className="block font-medium">
                {label}
              </label>
              <select
                id={name}
                name={name}
                defaultValue={name === 'specialty' ? (current ?? '') : undefined}
                value={name === 'specialty' ? undefined : (current ?? '')}
                onChange={(event) => {
                  if (name === 'branch') setSelectedBranch(event.target.value);
                  if (name === 'rank') setSelectedRank(event.target.value);
                }}
                disabled={name === 'rank' && !selectedBranch && !selectedRank}
                className="w-full rounded-md border p-2"
                aria-invalid={name === 'rank' && rankError ? true : undefined}
                aria-describedby={
                  [legacy ? `${name}-legacy` : '', name === 'rank' && rankError ? 'rank-error' : '']
                    .filter(Boolean)
                    .join(' ') || undefined
                }
              >
                <option value="">Sin indicar</option>
                {legacy && <option value={current!}>Valor registrado: {current}</option>}
                {options.map((option) => (
                  <option key={option.value} value={codes ? option.value : option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
              {legacy && (
                <p id={`${name}-legacy`} className="text-sm">
                  {name === 'rank'
                    ? `Empleo registrado: ${current} (no compatible con el ejército seleccionado o fuera del catálogo actual). Se conserva si no cambias ejército ni empleo.`
                    : 'Fuera del catálogo actual. Se conserva si no lo cambias.'}
                </p>
              )}
              {name === 'rank' && rankError && (
                <p id="rank-error" role="alert">
                  {rankError}
                </p>
              )}
            </div>
          );
        })}
        <div className="space-y-2">
          <label htmlFor="serviceYears" className="block font-medium">
            Años de servicio (opcional)
          </label>
          <input
            id="serviceYears"
            name="serviceYears"
            type="number"
            min={0}
            max={60}
            step={1}
            defaultValue={baseline?.service_years ?? ''}
            aria-describedby="years-help"
            className="w-full rounded-md border p-2"
          />
          <p id="years-help" className="text-sm">
            Entre 0 y 60. No equivale a años de experiencia técnica.
          </p>
        </div>
        <button type="submit" className="rounded-md border px-4 py-2 sm:col-span-2">
          {pending ? 'Guardando…' : 'Guardar perfil militar'}
        </button>
      </fieldset>
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
    </form>
  );
}
