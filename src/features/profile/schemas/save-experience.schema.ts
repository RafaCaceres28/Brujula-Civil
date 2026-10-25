import { z } from 'zod';
import { domainIdSchema } from '../../../lib/contracts/shared.schema';
import { structuredExperienceSchema } from '../../translation/schemas/structured-experience.schema';

// Commands pick editable fields; complete creates/patches retain canonical cross-field validation.
export const experienceFieldsSchema = z.object(structuredExperienceSchema.shape).strict().pick({
  activity: true,
  assignmentContext: true,
  durationRange: true,
  frequency: true,
  autonomy: true,
  participation: true,
  maintenanceTasks: true,
  instructionActivities: true,
  otherTasks: true,
});

export const createExperienceInputSchema = z
  .object({
    experience: experienceFieldsSchema.extend({ id: domainIdSchema }),
  })
  .strict()
  .refine((input) => structuredExperienceSchema.safeParse(input.experience).success, {
    path: ['experience'],
    message: 'Invalid experience',
  });

export const editExperienceInputSchema = z
  .object({
    id: domainIdSchema,
    expectedExperience: structuredExperienceSchema,
    set: experienceFieldsSchema.partial(),
    clear: z
      .array(
        z.enum([
          'assignmentContext',
          'durationRange',
          'frequency',
          'autonomy',
          'participation',
          'maintenanceTasks',
          'instructionActivities',
          'otherTasks',
        ]),
      )
      .refine((fields) => new Set(fields).size === fields.length, 'Duplicate clear field')
      .default([]),
  })
  .strict()
  .superRefine((input, context) => {
    if (Object.values(input.set).some((value) => value === undefined)) {
      context.addIssue({ code: 'custom', path: ['set'], message: 'Use clear to remove a field' });
    }
    if (input.id !== input.expectedExperience.id) {
      context.addIssue({
        code: 'custom',
        path: ['expectedExperience', 'id'],
        message: 'Baseline id must match',
      });
    }
    if (input.clear.some((field) => Object.hasOwn(input.set, field))) {
      context.addIssue({
        code: 'custom',
        path: ['clear'],
        message: 'Cannot set and clear the same field',
      });
    }
    const edited = { ...input.expectedExperience, ...input.set };
    input.clear.forEach((field) => delete edited[field]);
    if (!structuredExperienceSchema.safeParse(edited).success) {
      context.addIssue({ code: 'custom', path: ['set'], message: 'Invalid edited experience' });
    }
  });

export const saveExperienceCommandSchema = z.union([
  createExperienceInputSchema.safeExtend({ operation: z.literal('create') }),
  editExperienceInputSchema.safeExtend({ operation: z.literal('edit') }),
]);

export type SaveExperienceCommand = z.infer<typeof saveExperienceCommandSchema>;
