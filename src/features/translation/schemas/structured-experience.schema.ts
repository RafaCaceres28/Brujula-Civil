import { z } from 'zod';
import { domainIdSchema } from '../../../lib/contracts/shared.schema';
import { FUNCTION_TYPE_OPTIONS, TOOL_OPTIONS } from '../../wizard/config/wizard-catalogs';

const optionalNarrativeSchema = z.string().trim().min(1).max(500).optional();

export const structuredExperienceSchema = z
  .object({
    id: domainIdSchema,
    activity: z
      .string()
      .refine(
        (value) => FUNCTION_TYPE_OPTIONS.some((option) => option.value === value),
        'Select a valid activity catalog code',
      ),
    equipment: z
      .string()
      .refine(
        (value) => TOOL_OPTIONS.some((option) => option.value === value),
        'Select a valid equipment catalog code',
      )
      .optional(),
    context: optionalNarrativeSchema,
    result: optionalNarrativeSchema,
    // Approximate career span, not full-time years or continuous service.
    // Omitted means uninformed; not_sure explicitly means not remembered.
    durationRange: z
      .enum(['less_than_1_year', 'one_to_five_years', 'more_than_5_years', 'not_sure'])
      .optional(),
    // by_periods means seasonal periods without quantified intensity.
    frequency: z
      .enum([
        'daily_or_almost_daily',
        'several_times_per_week',
        'by_periods',
        'occasional',
        'not_sure',
      ])
      .optional(),
  })
  .strict();

export const structuredExperiencesSchema = z
  .array(structuredExperienceSchema)
  .superRefine((experiences, context) => {
    const ids = new Set<string>();
    experiences.forEach((experience, index) => {
      if (ids.has(experience.id)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'id'],
          message: 'Experience ids must be unique',
        });
      }
      ids.add(experience.id);
    });
  });

export type StructuredExperience = z.infer<typeof structuredExperienceSchema>;
