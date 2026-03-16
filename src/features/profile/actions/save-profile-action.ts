import { saveProfileInputSchema } from '@/features/profile/schemas/profile.schema';
import { updateProfile } from '@/features/profile/server/update-profile';

export async function saveProfileAction(rawInput: unknown) {
  const input = saveProfileInputSchema.parse(rawInput);
  await updateProfile(input);
}
