import { z } from 'zod';
import { careerStagesSchema } from './career-stage.schema';
import { structuredExperiencesSchema } from './structured-experience.schema';

export const careerHistorySchema = z
  .object({
    stages: careerStagesSchema.optional(),
    experiences: structuredExperiencesSchema,
  })
  .strict()
  .superRefine((history, context) => {
    const stageIds = new Set(history.stages?.map((stage) => stage.id));
    history.experiences.forEach((experience, experienceIndex) => {
      experience.stageIds?.forEach((stageId, stageIndex) => {
        if (!stageIds.has(stageId)) {
          context.addIssue({
            code: 'custom',
            path: ['experiences', experienceIndex, 'stageIds', stageIndex],
            message: 'Stage reference must identify an existing career stage',
          });
        }
      });
    });
  });

export type CareerHistory = z.infer<typeof careerHistorySchema>;
