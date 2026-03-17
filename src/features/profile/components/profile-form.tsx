'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ZodError, type ZodIssue } from 'zod';
import {
  saveDraftInputSchema,
  submitProfileInputSchema,
  type SaveDraftInputSchemaInput,
} from '../schemas/profile.schema';
import { ProfileActionError, type ProfileFormInitialValues } from '../types/profile.types';
import {
  CivilianTargetForm,
  type CivilianTargetChangeEvent,
  type CivilianTargetFormErrors,
  type CivilianTargetFormValues,
} from './civilian-target-form';
import {
  MilitaryBackgroundForm,
  type MilitaryBackgroundChangeEvent,
  type MilitaryBackgroundFormErrors,
  type MilitaryBackgroundFormValues,
} from './military-background-form';

type FieldErrors = Record<string, string>;

type ProfileFormValues = ProfileFormInitialValues & {
  militaryBackground: MilitaryBackgroundFormValues;
  civilianTarget: CivilianTargetFormValues;
};

type SubmitState = 'idle' | 'savingDraft' | 'submitting' | 'success' | 'error';

export type ProfileFormProps = {
  userId: string;
  initialValues?: Partial<ProfileFormInitialValues>;
  saveDraft?: (input: SaveDraftInputSchemaInput) => Promise<{ status: 'draft' }>;
  submitProfile?: (input: SaveDraftInputSchemaInput) => Promise<{ status: 'draft' | 'submitted' }>;
};

export type ProfileFormPayload = SaveDraftInputSchemaInput;

async function missingSaveDraftAction(): Promise<{ status: 'draft' }> {
  throw new Error('ProfileForm requires saveDraft action from a Server Component boundary.');
}

async function missingSubmitProfileAction(): Promise<{ status: 'draft' | 'submitted' }> {
  throw new Error('ProfileForm requires submitProfile action from a Server Component boundary.');
}

const EMPTY_VALUES: ProfileFormValues = {
  profile: {
    fullName: '',
    email: '',
    phone: '',
    city: '',
  },
  militaryBackground: {
    rank: '',
    area: '',
    yearsOfService: '',
    summary: '',
  },
  civilianTarget: {
    targetRole: '',
    targetSector: '',
    locationPreference: '',
  },
};

function mergeValues(initialValues?: Partial<ProfileFormInitialValues>): ProfileFormValues {
  return {
    profile: {
      ...EMPTY_VALUES.profile,
      ...initialValues?.profile,
    },
    militaryBackground: {
      ...EMPTY_VALUES.militaryBackground,
      ...initialValues?.militaryBackground,
    },
    civilianTarget: {
      ...EMPTY_VALUES.civilianTarget,
      ...initialValues?.civilianTarget,
    },
  };
}

function toNullableTrimmed(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableYearsOfService(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

export function serializeProfilePayload(
  userId: string,
  values: ProfileFormValues,
): SaveDraftInputSchemaInput {
  return {
    userId,
    profile: {
      fullName: values.profile.fullName,
      email: values.profile.email,
      phone: toNullableTrimmed(values.profile.phone),
      city: toNullableTrimmed(values.profile.city),
    },
    militaryBackground: {
      rank: toNullableTrimmed(values.militaryBackground.rank),
      area: toNullableTrimmed(values.militaryBackground.area),
      yearsOfService: toNullableYearsOfService(values.militaryBackground.yearsOfService),
      summary: toNullableTrimmed(values.militaryBackground.summary),
    },
    civilianTarget: {
      targetRole: toNullableTrimmed(values.civilianTarget.targetRole),
      targetSector: toNullableTrimmed(values.civilianTarget.targetSector),
      locationPreference: toNullableTrimmed(values.civilianTarget.locationPreference),
    },
  };
}

export function mapIssuesToFieldErrors(issues: ZodIssue[]): FieldErrors {
  return issues.reduce<FieldErrors>((acc, issue) => {
    const path = issue.path.join('.');
    if (!path) {
      return acc;
    }

    acc[path] = issue.message;
    return acc;
  }, {});
}

function mapActionError(error: unknown): { fieldErrors: FieldErrors; globalError: string | null } {
  if (error instanceof ProfileActionError && error.kind === 'validation') {
    const cause = error.cause;
    if (cause instanceof ZodError) {
      return {
        fieldErrors: mapIssuesToFieldErrors(cause.issues),
        globalError: 'Corrige los campos marcados e intenta nuevamente.',
      };
    }

    return {
      fieldErrors: {},
      globalError: error.message,
    };
  }

  if (error instanceof ProfileActionError && error.kind === 'domain') {
    return {
      fieldErrors: {},
      globalError: error.message,
    };
  }

  return {
    fieldErrors: {},
    globalError: 'Ocurrio un error inesperado. Intenta nuevamente.',
  };
}

export function ProfileForm({
  userId,
  initialValues,
  saveDraft = missingSaveDraftAction,
  submitProfile = missingSubmitProfileAction,
}: ProfileFormProps) {
  const [values, setValues] = useState<ProfileFormValues>(() => mergeValues(initialValues));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [shouldFocusErrors, setShouldFocusErrors] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);

  const isPending = submitState === 'savingDraft' || submitState === 'submitting';
  const hasErrors = Object.keys(fieldErrors).length > 0 || Boolean(globalError);

  const militaryErrors = useMemo<MilitaryBackgroundFormErrors>(
    () => ({
      rank: fieldErrors['militaryBackground.rank'],
      area: fieldErrors['militaryBackground.area'],
      yearsOfService: fieldErrors['militaryBackground.yearsOfService'],
      summary: fieldErrors['militaryBackground.summary'],
    }),
    [fieldErrors],
  );

  const civilianErrors = useMemo<CivilianTargetFormErrors>(
    () => ({
      targetRole: fieldErrors['civilianTarget.targetRole'],
      targetSector: fieldErrors['civilianTarget.targetSector'],
      locationPreference: fieldErrors['civilianTarget.locationPreference'],
    }),
    [fieldErrors],
  );

  useEffect(() => {
    if (!shouldFocusErrors || !hasErrors) {
      return;
    }

    const firstErroredField = Object.keys(fieldErrors)[0];
    const firstErroredElement = firstErroredField
      ? formRef.current?.querySelector<HTMLElement>(`[name="${firstErroredField}"]`)
      : null;

    if (errorSummaryRef.current) {
      errorSummaryRef.current.focus();
    } else if (firstErroredElement) {
      firstErroredElement.focus();
    }

    setShouldFocusErrors(false);
  }, [fieldErrors, hasErrors, shouldFocusErrors]);

  const handleProfileChange =
    (field: keyof ProfileFormValues['profile']) => (event: ChangeEvent<HTMLInputElement>) => {
      if (pendingRef.current || isPending) {
        return;
      }

      const nextValue = event.target.value;
      setValues((previous) => ({
        ...previous,
        profile: {
          ...previous.profile,
          [field]: nextValue,
        },
      }));
    };

  const handleMilitaryChange = <K extends keyof MilitaryBackgroundFormValues>(
    event: MilitaryBackgroundChangeEvent<K>,
  ) => {
    if (pendingRef.current || isPending) {
      return;
    }

    setValues((previous) => ({
      ...previous,
      militaryBackground: {
        ...previous.militaryBackground,
        [event.field]: event.value,
      },
    }));
  };

  const handleCivilianChange = <K extends keyof CivilianTargetFormValues>(
    event: CivilianTargetChangeEvent<K>,
  ) => {
    if (pendingRef.current || isPending) {
      return;
    }

    setValues((previous) => ({
      ...previous,
      civilianTarget: {
        ...previous.civilianTarget,
        [event.field]: event.value,
      },
    }));
  };

  const executeAction = async (mode: 'draft' | 'submit') => {
    if (pendingRef.current || isPending) {
      return;
    }

    const payload = serializeProfilePayload(userId, values);
    const schema = mode === 'draft' ? saveDraftInputSchema : submitProfileInputSchema;
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
      setFieldErrors(mapIssuesToFieldErrors(parsed.error.issues));
      setGlobalError('Corrige los campos marcados e intenta nuevamente.');
      setFeedback(null);
      setSubmitState('error');
      setShouldFocusErrors(true);
      return;
    }

    setSubmitState(mode === 'draft' ? 'savingDraft' : 'submitting');
    pendingRef.current = true;
    setFieldErrors({});
    setGlobalError(null);
    setFeedback(null);

    try {
      const result =
        mode === 'draft' ? await saveDraft(parsed.data) : await submitProfile(parsed.data);
      setSubmitState('success');
      if (mode === 'draft') {
        setFeedback('Borrador guardado correctamente.');
      } else {
        setFeedback(
          result.status === 'submitted'
            ? 'Perfil enviado correctamente.'
            : 'Perfil procesado correctamente.',
        );
      }
    } catch (error) {
      const mappedError = mapActionError(error);
      setFieldErrors(mappedError.fieldErrors);
      setGlobalError(mappedError.globalError);
      setFeedback(null);
      setSubmitState('error');
      setShouldFocusErrors(true);
    } finally {
      pendingRef.current = false;
    }
  };

  return (
    <form ref={formRef} noValidate>
      <fieldset disabled={isPending}>
        <legend>Perfil principal</legend>

        <label htmlFor="profile.fullName">Nombre completo</label>
        <input
          id="profile.fullName"
          name="profile.fullName"
          value={values.profile.fullName}
          onChange={handleProfileChange('fullName')}
          aria-invalid={Boolean(fieldErrors['profile.fullName'])}
          aria-describedby={fieldErrors['profile.fullName'] ? 'profile.fullName-error' : undefined}
        />
        {fieldErrors['profile.fullName'] ? (
          <p id="profile.fullName-error">{fieldErrors['profile.fullName']}</p>
        ) : null}

        <label htmlFor="profile.email">Email</label>
        <input
          id="profile.email"
          name="profile.email"
          value={values.profile.email}
          onChange={handleProfileChange('email')}
          aria-invalid={Boolean(fieldErrors['profile.email'])}
          aria-describedby={fieldErrors['profile.email'] ? 'profile.email-error' : undefined}
        />
        {fieldErrors['profile.email'] ? (
          <p id="profile.email-error">{fieldErrors['profile.email']}</p>
        ) : null}

        <label htmlFor="profile.phone">Telefono</label>
        <input
          id="profile.phone"
          name="profile.phone"
          value={values.profile.phone}
          onChange={handleProfileChange('phone')}
          aria-invalid={Boolean(fieldErrors['profile.phone'])}
          aria-describedby={fieldErrors['profile.phone'] ? 'profile.phone-error' : undefined}
        />
        {fieldErrors['profile.phone'] ? (
          <p id="profile.phone-error">{fieldErrors['profile.phone']}</p>
        ) : null}

        <label htmlFor="profile.city">Ciudad</label>
        <input
          id="profile.city"
          name="profile.city"
          value={values.profile.city}
          onChange={handleProfileChange('city')}
          aria-invalid={Boolean(fieldErrors['profile.city'])}
          aria-describedby={fieldErrors['profile.city'] ? 'profile.city-error' : undefined}
        />
        {fieldErrors['profile.city'] ? (
          <p id="profile.city-error">{fieldErrors['profile.city']}</p>
        ) : null}
      </fieldset>

      <MilitaryBackgroundForm
        values={values.militaryBackground}
        errors={militaryErrors}
        disabled={isPending}
        onChange={handleMilitaryChange}
      />

      <CivilianTargetForm
        values={values.civilianTarget}
        errors={civilianErrors}
        disabled={isPending}
        onChange={handleCivilianChange}
      />

      {hasErrors ? (
        <div
          id="profile-form-error-summary"
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
          ref={errorSummaryRef}
        >
          {globalError ?? 'Corrige los campos marcados e intenta nuevamente.'}
        </div>
      ) : null}

      {feedback ? (
        <div role="status" aria-live="polite">
          {feedback}
        </div>
      ) : null}

      <button
        type="button"
        data-action="save-draft"
        onClick={() => executeAction('draft')}
        disabled={isPending}
      >
        Guardar borrador
      </button>
      <button
        type="button"
        data-action="submit-profile"
        onClick={() => executeAction('submit')}
        disabled={isPending}
      >
        Enviar perfil
      </button>
    </form>
  );
}
