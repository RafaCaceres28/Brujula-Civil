'use client';

export type CivilianTargetFormValues = {
  targetRole: string;
  targetSector: string;
  locationPreference: string;
};

export type CivilianTargetField = keyof CivilianTargetFormValues;

export type CivilianTargetFormErrors = Partial<Record<CivilianTargetField, string>>;

export type CivilianTargetChangeEvent<K extends CivilianTargetField = CivilianTargetField> = {
  field: K;
  value: CivilianTargetFormValues[K];
};

export type CivilianTargetFormProps = {
  values: CivilianTargetFormValues;
  errors: CivilianTargetFormErrors;
  disabled?: boolean;
  onChange: <K extends CivilianTargetField>(event: CivilianTargetChangeEvent<K>) => void;
};

function getFieldErrorId(field: CivilianTargetField) {
  return `civilianTarget.${field}-error`;
}

function getFieldErrorProps(field: CivilianTargetField, errors: CivilianTargetFormErrors) {
  const hasError = Boolean(errors[field]);
  return {
    'aria-invalid': hasError,
    'aria-describedby': hasError ? getFieldErrorId(field) : undefined,
  };
}

export function CivilianTargetForm({
  values,
  errors,
  disabled = false,
  onChange,
}: CivilianTargetFormProps) {
  return (
    <fieldset disabled={disabled}>
      <legend>Objetivo civil</legend>

      <label htmlFor="civilianTarget.targetRole">Rol objetivo</label>
      <input
        id="civilianTarget.targetRole"
        name="civilianTarget.targetRole"
        value={values.targetRole}
        onChange={(event) => onChange({ field: 'targetRole', value: event.target.value })}
        {...getFieldErrorProps('targetRole', errors)}
      />
      {errors.targetRole ? <p id={getFieldErrorId('targetRole')}>{errors.targetRole}</p> : null}

      <label htmlFor="civilianTarget.targetSector">Sector objetivo</label>
      <input
        id="civilianTarget.targetSector"
        name="civilianTarget.targetSector"
        value={values.targetSector}
        onChange={(event) => onChange({ field: 'targetSector', value: event.target.value })}
        {...getFieldErrorProps('targetSector', errors)}
      />
      {errors.targetSector ? (
        <p id={getFieldErrorId('targetSector')}>{errors.targetSector}</p>
      ) : null}

      <label htmlFor="civilianTarget.locationPreference">Preferencia de ubicacion</label>
      <input
        id="civilianTarget.locationPreference"
        name="civilianTarget.locationPreference"
        value={values.locationPreference}
        onChange={(event) => onChange({ field: 'locationPreference', value: event.target.value })}
        {...getFieldErrorProps('locationPreference', errors)}
      />
      {errors.locationPreference ? (
        <p id={getFieldErrorId('locationPreference')}>{errors.locationPreference}</p>
      ) : null}
    </fieldset>
  );
}
