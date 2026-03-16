import type { SaveProfileInput } from '@/features/profile/types/profile.types';
import { saveProfile } from './save-profile';

export async function updateProfile(input: SaveProfileInput) {
  await saveProfile(input);
}
