import { z } from 'zod';
import { militarStepSchema } from '../../wizard/schemas/wizard.schema';
import type { UserMilitaryProfileRow } from '@/types/database.types';
import {
  MILITARY_BASICS_BRANCH_OPTIONS,
  MILITARY_BASICS_RANK_OPTIONS,
  MILITARY_BASICS_COMBINATION_ERROR,
  militaryBasicsCombinationAllowed,
} from '../config/military-basics.catalog';

export const militaryBasicsFieldsSchema = militarStepSchema
  .pick({ specialty: true, serviceYears: true })
  .extend({
    branch: z.enum(MILITARY_BASICS_BRANCH_OPTIONS.map((option) => option.value)).nullable(),
    rank: z
      .strictObject({ code: z.string().nullable(), label: z.string().nullable() })
      .refine(
        ({ code, label }) =>
          (code === null && label === null) ||
          MILITARY_BASICS_RANK_OPTIONS.some(
            (option) => option.value === code && option.persistedLabel === label,
          ),
        { message: 'Selecciona un empleo válido del catálogo local.' },
      ),
  })
  .partial()
  .strict();

// Baselines preserve DB values verbatim, including values outside today's catalog.
export const militaryBasicsRowSchema = z.strictObject({
  id: z.string().min(1),
  branch: z.string().nullable(),
  rank_text: z.string().nullable(),
  specialty_text: z.string().nullable(),
  service_years: z.number().int().nullable(),
});

export type MilitaryBasicsRow = Pick<
  UserMilitaryProfileRow,
  'id' | 'branch' | 'rank_text' | 'specialty_text' | 'service_years'
>;

export const saveMilitaryBasicsSchema = z
  .strictObject({
    expected: militaryBasicsRowSchema.nullable(),
    set: militaryBasicsFieldsSchema,
  })
  .superRefine(({ expected, set }, context) => {
    if (set.branch === undefined && set.rank === undefined) return;
    const branch = set.branch !== undefined ? set.branch : (expected?.branch ?? null);
    const rank = set.rank !== undefined ? set.rank.label : (expected?.rank_text ?? null);
    if (!militaryBasicsCombinationAllowed(branch, rank)) {
      context.addIssue({
        code: 'custom',
        path: ['set', 'rank'],
        message: MILITARY_BASICS_COMBINATION_ERROR,
      });
    }
  });

export type MilitaryBasicsFields = z.infer<typeof militaryBasicsFieldsSchema>;
