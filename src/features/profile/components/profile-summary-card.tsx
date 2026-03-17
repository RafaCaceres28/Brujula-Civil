import { useId } from 'react';
import { PROFILE_SUMMARY_FALLBACKS } from '../services/profile.mapper';
import type {
  ProfileSummaryCardProps,
  ProfileSummaryViewModel,
  ProfileSummaryVisualState,
} from '../types/profile.types';

type SummaryFieldKey = keyof ProfileSummaryViewModel;

const SUMMARY_FIELDS: ReadonlyArray<{ key: SummaryFieldKey; label: string }> = [
  { key: 'fullName', label: 'Nombre completo' },
  { key: 'primaryGoal', label: 'Objetivo principal' },
  { key: 'location', label: 'Ubicacion' },
];

function hasMeaningfulValue(value: string, fallbackValue: string): boolean {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 && trimmedValue !== fallbackValue;
}

export function deriveProfileSummaryVisualState(
  summary: ProfileSummaryViewModel,
): ProfileSummaryVisualState {
  const completeFields = SUMMARY_FIELDS.filter(({ key }) =>
    hasMeaningfulValue(summary[key], PROFILE_SUMMARY_FALLBACKS[key]),
  ).length;

  if (completeFields === 0) {
    return 'vacio';
  }

  if (completeFields === SUMMARY_FIELDS.length) {
    return 'completo';
  }

  return 'parcial';
}

function getStateDescription(state: ProfileSummaryVisualState): string {
  if (state === 'completo') {
    return 'Estado del resumen: completo.';
  }

  if (state === 'parcial') {
    return 'Estado del resumen: parcial.';
  }

  return 'Estado del resumen: vacio.';
}

export function ProfileSummaryCard({ summary, state }: ProfileSummaryCardProps) {
  const headingId = useId();
  const statusId = useId();
  const visualState = state ?? deriveProfileSummaryVisualState(summary);

  return (
    <section aria-labelledby={headingId} aria-describedby={statusId}>
      <h2 id={headingId}>Resumen de perfil</h2>
      <p id={statusId} role="status" aria-live="polite">
        {getStateDescription(visualState)}
      </p>

      <dl>
        {SUMMARY_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{summary[key]}</dd>
          </div>
        ))}
      </dl>

      {visualState === 'vacio' ? (
        <p>Aun no hay datos clave del perfil. Completa tu informacion para ver este resumen.</p>
      ) : null}
    </section>
  );
}
