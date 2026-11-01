'use client';

import { useRef, useState } from 'react';
import { saveContactDetailsAction } from '../actions/save-contact-details-action';
import {
  contactDetailsPatchSchema,
  type ContactDetailsPatch,
  type ContactDetailsRow,
} from '../schemas/contact-details.schema';

const FIELDS = [
  {
    name: 'display_name',
    label: 'Nombre completo',
    type: 'text',
    autoComplete: 'name',
    maxLength: 200,
  },
  { name: 'phone', label: 'Teléfono', type: 'tel', autoComplete: 'tel', maxLength: 40 },
  {
    name: 'contact_email',
    label: 'Email profesional',
    type: 'email',
    autoComplete: 'email',
    maxLength: 254,
  },
  {
    name: 'locality_province',
    label: 'Localidad / provincia',
    type: 'text',
    autoComplete: 'address-level2',
    maxLength: 160,
  },
] as const;

export function ContactDetailsForm({ initial }: { initial: ContactDetailsRow | null }) {
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState<ContactDetailsRow>(
    initial ?? {
      display_name: null,
      phone: null,
      contact_email: null,
      locality_province: null,
    },
  );
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactDetailsRow, string>>>({});

  return (
    <form
      className="space-y-6"
      onChange={() => {
        setMessage(null);
        setErrors({});
      }}
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy.current) return;
        const form = event.currentTarget;
        const set: ContactDetailsPatch = {};
        for (const { name } of FIELDS) {
          const value = draft[name] ?? '';
          if (value !== (baseline?.[name] ?? '')) set[name] = value;
        }
        const parsed = contactDetailsPatchSchema.safeParse(set);
        if (!parsed.success) {
          const nextErrors: typeof errors = {};
          for (const issue of parsed.error.issues)
            nextErrors[issue.path[0] as keyof ContactDetailsRow] = issue.message;
          setErrors(nextErrors);
          const name = parsed.error.issues[0]?.path[0];
          if (typeof name === 'string')
            (form.elements.namedItem(name) as HTMLInputElement)?.focus();
          return;
        }
        if (
          !Object.entries(parsed.data).some(
            ([key, value]) => value !== (baseline?.[key as keyof ContactDetailsRow] ?? null),
          )
        ) {
          setMessage({ error: false, text: 'No hay cambios para guardar.' });
          return;
        }
        busy.current = true;
        setPending(true);
        setMessage(null);
        try {
          const result = await saveContactDetailsAction({ expected: baseline, set: parsed.data });
          if (result.ok) {
            setBaseline(result.data);
            setDraft(result.data);
            setMessage({ error: false, text: 'Datos de contacto guardados.' });
          } else setMessage({ error: true, text: result.error.message });
        } catch {
          setMessage({
            error: true,
            text: 'No se pudo confirmar el guardado. Tus cambios se conservan en el formulario.',
          });
        } finally {
          busy.current = false;
          setPending(false);
        }
      }}
      noValidate
    >
      <p id="contact-help" className="text-sm text-slate-600">
        Todos los campos son opcionales. Se mostrarán en tu borrador de CV. El email profesional no
        cambia tu email de acceso. Vacía un campo para eliminarlo.
      </p>
      <fieldset
        disabled={pending}
        aria-describedby="contact-help"
        className="grid min-w-0 gap-5 sm:grid-cols-2"
      >
        <legend className="mb-4 font-medium">Datos de contacto</legend>
        {FIELDS.map(({ name, label, type, autoComplete, maxLength }) => (
          <div
            key={name}
            className={`min-w-0 space-y-2 ${name === 'display_name' || name === 'locality_province' ? 'sm:col-span-2' : ''}`}
          >
            <label htmlFor={name} className="block font-medium">
              {label}
            </label>
            <input
              id={name}
              name={name}
              type={type}
              autoComplete={autoComplete}
              maxLength={maxLength}
              value={draft[name] ?? ''}
              onChange={(event) => {
                if (busy.current) return;
                const value = event.currentTarget.value;
                setDraft((current) => ({ ...current, [name]: value }));
              }}
              aria-invalid={Boolean(errors[name])}
              aria-describedby={errors[name] ? `${name}-error` : undefined}
              className="w-full rounded-md border p-2"
            />
            {errors[name] && (
              <p id={`${name}-error`} role="alert" className="text-sm">
                {errors[name]}
              </p>
            )}
          </div>
        ))}
        <button type="submit" className="rounded-md border px-4 py-2 sm:col-span-2">
          {pending ? 'Guardando...' : 'Guardar datos de contacto'}
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
