import { z } from 'zod';
import { domainIdSchema } from '../../../lib/contracts/shared.schema';

export const careerStageSchema = z
  .object({
    id: domainIdSchema,
    focus: z.enum([
      'operational',
      'technical',
      'logistics',
      'administration',
      'instruction',
      'other',
    ]),
  })
  .strict();

export const careerStagesSchema = z.array(careerStageSchema).superRefine((stages, context) => {
  const ids = new Set<string>();
  stages.forEach((stage, index) => {
    if (ids.has(stage.id)) {
      context.addIssue({
        code: 'custom',
        path: [index, 'id'],
        message: 'Stage ids must be unique',
      });
    }
    ids.add(stage.id);
  });
});

export type CareerStage = z.infer<typeof careerStageSchema>;
