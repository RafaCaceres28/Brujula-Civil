import { submitProfileInputSchema } from '../schemas/profile.schema';
import { submitProfile } from '@/features/profile/server/submit-profile';

export async function submitProfileAction(rawInput: unknown) {
  const input = submitProfileInputSchema.parse(rawInput);
  await submitProfile(input);
}
