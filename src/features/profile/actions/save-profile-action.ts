import { saveDraftInputSchema } from '../schemas/profile.schema';
import { saveProfile } from '@/features/profile/server/save-profile';

export async function saveDraftAction(rawInput: unknown) {
  const input = saveDraftInputSchema.parse(rawInput);
  await saveProfile(input);
}

export const saveProfileAction = saveDraftAction;
