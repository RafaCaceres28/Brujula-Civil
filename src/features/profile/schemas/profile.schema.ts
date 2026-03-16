import { z } from 'zod';
import type { ProfileFormValues, SaveProfileInput } from '@/features/profile/types/profile.types';

const profileFormValuesShape = {
  fullName: z.string().trim().min(1),
  email: z.string().email(),
  phone: z.string().trim(),
  city: z.string().trim(),
};

export const profileFormValuesSchema: z.ZodType<ProfileFormValues> =
  z.object(profileFormValuesShape);

export const saveProfileInputSchema: z.ZodType<SaveProfileInput> = z.object({
  userId: z.string().trim().min(1),
  profile: profileFormValuesSchema,
});

export type ProfileFormValuesSchemaInput = z.infer<typeof profileFormValuesSchema>;
export type SaveProfileInputSchemaInput = z.infer<typeof saveProfileInputSchema>;
