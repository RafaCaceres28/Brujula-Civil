'use client';

export type CivilianTargetFormValues = {
  targetRole: string;
  targetSector: string;
  locationPreference: string;
};

export type CivilianTargetField = keyof CivilianTargetFormValues;

export type CivilianTargetFormProps = {
  values: CivilianTargetFormValues;
  errors: Partial<Record<CivilianTargetField, string>>;
  disabled?: boolean;
  onChange: <K extends CivilianTargetField>(field: K, value: CivilianTargetFormValues[K]) => void;
};

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
        onChange={(event) => onChange('targetRole', event.target.value)}
        aria-invalid={Boolean(errors.targetRole)}
        aria-describedby={errors.targetRole ? 'civilianTarget.targetRole-error' : undefined}
      />
      {errors.targetRole ? <p id="civilianTarget.targetRole-error">{errors.targetRole}</p> : null}

      <label htmlFor="civilianTarget.targetSector">Sector objetivo</label>
      <input
        id="civilianTarget.targetSector"
        name="civilianTarget.targetSector"
        value={values.targetSector}
        onChange={(event) => onChange('targetSector', event.target.value)}
        aria-invalid={Boolean(errors.targetSector)}
        aria-describedby={errors.targetSector ? 'civilianTarget.targetSector-error' : undefined}
      />
      {errors.targetSector ? (
        <p id="civilianTarget.targetSector-error">{errors.targetSector}</p>
      ) : null}

      <label htmlFor="civilianTarget.locationPreference">Preferencia de ubicacion</label>
      <input
        id="civilianTarget.locationPreference"
        name="civilianTarget.locationPreference"
        value={values.locationPreference}
        onChange={(event) => onChange('locationPreference', event.target.value)}
        aria-invalid={Boolean(errors.locationPreference)}
        aria-describedby={
          errors.locationPreference ? 'civilianTarget.locationPreference-error' : undefined
        }
      />
      {errors.locationPreference ? (
        <p id="civilianTarget.locationPreference-error">{errors.locationPreference}</p>
      ) : null}
    </fieldset>
  );
}
