import { z } from 'zod';
import { domainIdSchema } from '../../../lib/contracts/shared.schema';

export const academicStudySchema = z.strictObject({
  id: domainIdSchema,
  title: z
    .string()
    .trim()
    .min(1, 'Indica el nombre de los estudios.')
    .max(200, 'El nombre admite hasta 200 caracteres.'),
  institution: z
    .string()
    .trim()
    .max(200, 'El centro admite hasta 200 caracteres.')
    .nullable()
    .optional()
    .transform((value) => value || null),
  year: z
    .number()
    .int('Introduce un año entero.')
    .min(1000, 'Introduce un año de cuatro cifras.')
    .max(9999, 'Introduce un año de cuatro cifras.')
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  status: z.enum(['completed', 'in_progress'], {
    error: 'Indica si los estudios están finalizados o en curso.',
  }),
});

export const academicEducationSchema = z.array(academicStudySchema).superRefine((entries, ctx) => {
  if (new Set(entries.map(({ id }) => id)).size !== entries.length)
    ctx.addIssue({ code: 'custom', message: 'Cada estudio debe tener un identificador único.' });
});

export const saveAcademicEducationSchema = z.strictObject({
  expected: academicEducationSchema.nullable(),
  academicEducation: academicEducationSchema,
});

export type AcademicStudy = z.infer<typeof academicStudySchema>;
export type AcademicEducation = z.infer<typeof academicEducationSchema>;
