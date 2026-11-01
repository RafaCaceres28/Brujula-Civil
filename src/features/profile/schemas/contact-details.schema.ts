import { z } from 'zod';

// Baselines preserve stored text verbatim, including legacy names outside editor limits.
export const contactDetailsRowSchema = z.strictObject({
  display_name: z.string().nullable(),
  phone: z.string().nullable(),
  contact_email: z.string().nullable(),
  locality_province: z.string().nullable(),
});

const optionalText = (schema: z.ZodString) =>
  z
    .string()
    .nullable()
    .transform((value) => value?.trim() || null)
    .pipe(schema.nullable())
    .optional();

export const contactDetailsPatchSchema = z.strictObject({
  display_name: optionalText(z.string().max(200, 'El nombre admite hasta 200 caracteres.')),
  phone: optionalText(
    z
      .string()
      .max(40, 'El teléfono admite hasta 40 caracteres.')
      .regex(
        /^(?=.*\d)[+\d\s().-]+$/,
        'Introduce un teléfono con dígitos, espacios, paréntesis, puntos o guiones.',
      ),
  ),
  contact_email: optionalText(z.string().max(254).email('Introduce un email profesional válido.')),
  locality_province: optionalText(
    z.string().max(160, 'La localidad / provincia admite hasta 160 caracteres.'),
  ),
});

export const saveContactDetailsSchema = z.strictObject({
  expected: contactDetailsRowSchema.nullable(),
  set: contactDetailsPatchSchema,
});

export type ContactDetailsRow = z.infer<typeof contactDetailsRowSchema>;
export type ContactDetailsPatch = z.input<typeof contactDetailsPatchSchema>;
