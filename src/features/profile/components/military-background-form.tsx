'use client';

export type MilitaryBackgroundFormValues = {
  rank: string;
  area: string;
  yearsOfService: string;
  summary: string;
};

export type MilitaryBackgroundField = keyof MilitaryBackgroundFormValues;

export type MilitaryBackgroundFormProps = {
  values: MilitaryBackgroundFormValues;
  errors: Partial<Record<MilitaryBackgroundField, string>>;
  disabled?: boolean;
  onChange: <K extends MilitaryBackgroundField>(
    field: K,
    value: MilitaryBackgroundFormValues[K],
  ) => void;
};

export function MilitaryBackgroundForm({
  values,
  errors,
  disabled = false,
  onChange,
}: MilitaryBackgroundFormProps) {
  return (
    <fieldset disabled={disabled}>
      <legend>Antecedentes militares</legend>

      <label htmlFor="militaryBackground.rank">Rango</label>
      <input
        id="militaryBackground.rank"
        name="militaryBackground.rank"
        value={values.rank}
        onChange={(event) => onChange('rank', event.target.value)}
        aria-invalid={Boolean(errors.rank)}
        aria-describedby={errors.rank ? 'militaryBackground.rank-error' : undefined}
      />
      {errors.rank ? <p id="militaryBackground.rank-error">{errors.rank}</p> : null}

      <label htmlFor="militaryBackground.area">Area</label>
      <input
        id="militaryBackground.area"
        name="militaryBackground.area"
        value={values.area}
        onChange={(event) => onChange('area', event.target.value)}
        aria-invalid={Boolean(errors.area)}
        aria-describedby={errors.area ? 'militaryBackground.area-error' : undefined}
      />
      {errors.area ? <p id="militaryBackground.area-error">{errors.area}</p> : null}

      <label htmlFor="militaryBackground.yearsOfService">Anos de servicio</label>
      <input
        id="militaryBackground.yearsOfService"
        name="militaryBackground.yearsOfService"
        type="number"
        min={0}
        max={60}
        value={values.yearsOfService}
        onChange={(event) => onChange('yearsOfService', event.target.value)}
        aria-invalid={Boolean(errors.yearsOfService)}
        aria-describedby={
          errors.yearsOfService ? 'militaryBackground.yearsOfService-error' : undefined
        }
      />
      {errors.yearsOfService ? (
        <p id="militaryBackground.yearsOfService-error">{errors.yearsOfService}</p>
      ) : null}

      <label htmlFor="militaryBackground.summary">Resumen</label>
      <textarea
        id="militaryBackground.summary"
        name="militaryBackground.summary"
        value={values.summary}
        onChange={(event) => onChange('summary', event.target.value)}
        aria-invalid={Boolean(errors.summary)}
        aria-describedby={errors.summary ? 'militaryBackground.summary-error' : undefined}
      />
      {errors.summary ? <p id="militaryBackground.summary-error">{errors.summary}</p> : null}
    </fieldset>
  );
}
