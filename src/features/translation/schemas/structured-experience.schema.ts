import { z } from 'zod';
import { domainIdSchema } from '../../../lib/contracts/shared.schema';
import { FUNCTION_TYPE_OPTIONS, TOOL_OPTIONS } from '../../wizard/config/wizard-catalogs';

const optionalNarrativeSchema = z.string().trim().min(1).max(500).optional();

export const structuredExperienceSchema = z
  .object({
    id: domainIdSchema,
    stageIds: z
      .array(domainIdSchema)
      .min(1)
      .refine((ids) => new Set(ids).size === ids.length, 'Stage references must be unique')
      .optional(),
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
    // Declared usual autonomy, not inferred from rank or career duration.
    autonomy: z.enum(['supervised', 'partially_autonomous', 'autonomous', 'not_sure']).optional(),
    // Coordination/instruction does not establish formal command or teaching qualifications.
    participation: z
      .array(z.enum(['assisted', 'performed', 'coordinated', 'instructed']))
      .min(1)
      .refine(
        (values) => new Set(values).size === values.length,
        'Participation values must be unique',
      )
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
