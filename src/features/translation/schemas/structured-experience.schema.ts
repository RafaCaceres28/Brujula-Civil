import { z } from 'zod';
import { domainIdSchema } from '../../../lib/contracts/shared.schema';
import { FUNCTION_TYPE_OPTIONS, TOOL_OPTIONS } from '../../wizard/config/wizard-catalogs';
import { INSTRUCTION_ACTIVITIES, type InstructionActivity } from '../config/instruction-activities';
import {
  MAINTENANCE_MATERIALS,
  MAINTENANCE_OPERATIONS,
  isMaintenanceOperationApplicable,
} from '../config/maintenance-catalog';

const optionalNarrativeSchema = z.string().trim().min(1).max(500).optional();

const maintenanceTasksSchema = z
  .array(
    z
      .object({
        material: z.enum(
          Object.keys(MAINTENANCE_MATERIALS) as [
            keyof typeof MAINTENANCE_MATERIALS,
            ...(keyof typeof MAINTENANCE_MATERIALS)[],
          ],
        ),
        operations: z
          .array(
            z.enum(
              Object.keys(MAINTENANCE_OPERATIONS) as [
                keyof typeof MAINTENANCE_OPERATIONS,
                ...(keyof typeof MAINTENANCE_OPERATIONS)[],
              ],
            ),
          )
          .min(1)
          .refine((values) => new Set(values).size === values.length, 'Duplicate operation')
          .optional(),
      })
      .strict()
      .superRefine((entry, context) => {
        entry.operations?.forEach((operation, index) => {
          if (!isMaintenanceOperationApplicable(entry.material, operation)) {
            context.addIssue({
              code: 'custom',
              path: ['operations', index],
              message: 'Operation not applicable to material',
            });
          }
        });
      }),
  )
  .min(1)
  .refine(
    (entries) => new Set(entries.map(({ material }) => material)).size === entries.length,
    'Duplicate material',
  );

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
    maintenanceTasks: maintenanceTasksSchema.optional(),
    instructionActivities: z
      .array(
        z.enum(
          Object.keys(INSTRUCTION_ACTIVITIES) as [InstructionActivity, ...InstructionActivity[]],
        ),
      )
      .min(1)
      .refine((values) => new Set(values).size === values.length, 'Duplicate instruction activity')
      .optional(),
    // Assignment context, not frequency/duration; absence means undeclared.
    // Replacement implies no formal appointment, higher position or replaced person's rank.
    assignmentContext: z
      .enum(['regular_duties', 'temporary_assignment', 'acting_replacement', 'not_sure'])
      .optional(),
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
  .strict()
  .refine(
    (experience) =>
      !Object.hasOwn(experience, 'maintenanceTasks') || experience.activity === 'op_maintenance',
    { path: ['maintenanceTasks'], message: 'Maintenance tasks require op_maintenance' },
  )
  .refine(
    (experience) =>
      !Object.hasOwn(experience, 'instructionActivities') || experience.activity === 'instruction',
    { path: ['instructionActivities'], message: 'Instruction details require instruction' },
  );

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
