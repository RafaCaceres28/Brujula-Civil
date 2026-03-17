'use client';

export type MilitaryBackgroundFormValues = {
  rank: string;
  area: string;
  yearsOfService: string;
  summary: string;
};

export type MilitaryBackgroundField = keyof MilitaryBackgroundFormValues;

export type MilitaryBackgroundFormErrors = Partial<Record<MilitaryBackgroundField, string>>;

export type MilitaryBackgroundChangeEvent<
  K extends MilitaryBackgroundField = MilitaryBackgroundField,
> = {
  field: K;
  value: MilitaryBackgroundFormValues[K];
};

export type MilitaryBackgroundFormProps = {
  values: MilitaryBackgroundFormValues;
  errors: MilitaryBackgroundFormErrors;
  disabled?: boolean;
  onChange: <K extends MilitaryBackgroundField>(event: MilitaryBackgroundChangeEvent<K>) => void;
};

function getFieldErrorId(field: MilitaryBackgroundField) {
  return `militaryBackground.${field}-error`;
}

function getFieldErrorProps(field: MilitaryBackgroundField, errors: MilitaryBackgroundFormErrors) {
  const hasError = Boolean(errors[field]);
  return {
    'aria-invalid': hasError,
    'aria-describedby': hasError ? getFieldErrorId(field) : undefined,
  };
}

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
        onChange={(event) => onChange({ field: 'rank', value: event.target.value })}
        {...getFieldErrorProps('rank', errors)}
      />
      {errors.rank ? <p id={getFieldErrorId('rank')}>{errors.rank}</p> : null}

      <label htmlFor="militaryBackground.area">Area</label>
      <input
        id="militaryBackground.area"
        name="militaryBackground.area"
        value={values.area}
        onChange={(event) => onChange({ field: 'area', value: event.target.value })}
        {...getFieldErrorProps('area', errors)}
      />
      {errors.area ? <p id={getFieldErrorId('area')}>{errors.area}</p> : null}

      <label htmlFor="militaryBackground.yearsOfService">Anos de servicio</label>
      <input
        id="militaryBackground.yearsOfService"
        name="militaryBackground.yearsOfService"
        type="number"
        min={0}
        max={60}
        value={values.yearsOfService}
        onChange={(event) => onChange({ field: 'yearsOfService', value: event.target.value })}
        {...getFieldErrorProps('yearsOfService', errors)}
      />
      {errors.yearsOfService ? (
        <p id={getFieldErrorId('yearsOfService')}>{errors.yearsOfService}</p>
      ) : null}

      <label htmlFor="militaryBackground.summary">Resumen</label>
      <textarea
        id="militaryBackground.summary"
        name="militaryBackground.summary"
        value={values.summary}
        onChange={(event) => onChange({ field: 'summary', value: event.target.value })}
        {...getFieldErrorProps('summary', errors)}
      />
      {errors.summary ? <p id={getFieldErrorId('summary')}>{errors.summary}</p> : null}
    </fieldset>
  );
}
